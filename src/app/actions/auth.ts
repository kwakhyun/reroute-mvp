"use server";

import { randomUUID } from "node:crypto";
import { and, count, eq, gt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, deleteCurrentSession } from "@/server/auth/session";
import { isLoginRateLimited } from "@/server/auth/login-rate-limit";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { db } from "@/server/db/client";
import { auditLogs, loginAttempts, users } from "@/server/db/schema";
import { DEMO_ACCOUNTS } from "@/server/demo-data";
import { getRequestIpHash, hashSensitiveIdentifier } from "@/server/security/request";
import { resetDemoDatabase } from "../../../scripts/seed";

export type LoginState = { error?: string };

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("올바른 이메일을 입력해 주세요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.").max(128),
});

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  const ipHash = await getRequestIpHash();
  const identifierHash = hashSensitiveIdentifier(`${ipHash}:${parsed.data.email}`);
  const windowStart = new Date(Date.now() - 15 * 60 * 1000);
  const attemptId = randomUUID();
  const reserved = await db.transaction(async (tx) => {
    const [recentFailures] = await tx
      .select({ count: count() })
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.identifierHash, identifierHash),
          eq(loginAttempts.successful, false),
          gt(loginAttempts.createdAt, windowStart),
        ),
      );
    if (isLoginRateLimited(recentFailures?.count ?? 0)) return false;
    await tx.insert(loginAttempts).values({
      id: attemptId,
      identifierHash,
      successful: false,
    });
    return true;
  });

  if (!reserved) {
    return { error: "로그인 시도가 많습니다. 15분 후 다시 시도해 주세요." };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  const valid = user
    ? await verifyPassword(parsed.data.password, user.passwordHash)
    : Boolean(await hashPassword(parsed.data.password)) && false;

  if (!user || !valid) {
    await db.insert(auditLogs).values({
      id: randomUUID(),
      actorUserId: null,
      action: "LOGIN_FAILED",
      entityType: "AUTH",
      entityId: identifierHash.slice(0, 16),
      ipHash,
      metadataJson: "{}",
    });
    return { error: "이메일 또는 비밀번호를 확인해 주세요." };
  }

  await db.update(loginAttempts).set({ successful: true }).where(eq(loginAttempts.id, attemptId));

  await createSession(user.id);
  await db.insert(auditLogs).values({
    id: randomUUID(),
    actorUserId: user.id,
    action: "LOGIN_SUCCEEDED",
    entityType: "AUTH",
    entityId: user.id,
    ipHash,
    metadataJson: "{}",
  });

  redirect("/projects");
}

export async function logoutAction() {
  await deleteCurrentSession();
  redirect("/login");
}

async function findDemoApprover() {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, DEMO_ACCOUNTS.approver.email))
    .limit(1);

  return user;
}

async function openDemoSession() {
  let user = await findDemoApprover();

  // A fresh deployment may not have been seeded yet. Repair that exceptional
  // case without making every normal demo visit pay the reset cost.
  if (!user) {
    await resetDemoDatabase();
    user = await findDemoApprover();
  }

  if (!user) {
    throw new Error("데모 계정을 찾을 수 없습니다.");
  }

  await createSession(user.id);
  redirect("/projects");
}

export async function demoLoginAction() {
  if (process.env.DEMO_MODE !== "true") {
    throw new Error("Demo login is disabled");
  }

  await openDemoSession();
}

export async function resetDemoLoginAction() {
  if (process.env.DEMO_MODE !== "true") {
    throw new Error("Demo reset is disabled");
  }

  await resetDemoDatabase();
  await openDemoSession();
}
