import "server-only";

import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/server/db/client";
import { sessions, users } from "@/server/db/schema";
import { AuthenticationError } from "./errors";

const SESSION_COOKIE = "reroute_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function getPepper() {
  const pepper = process.env.SESSION_PEPPER;
  if (!pepper || pepper.length < 32) {
    throw new Error("SESSION_PEPPER must contain at least 32 characters");
  }
  return pepper;
}

function hashSessionToken(token: string) {
  return createHmac("sha256", getPepper()).update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    id: randomUUID(),
    tokenHash: hashSessionToken(token),
    userId,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
  }

  cookieStore.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const [record] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      team: users.team,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashSessionToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return record ?? null;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthenticationError();
  }
  return user;
}
