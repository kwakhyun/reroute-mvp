import assert from "node:assert/strict";
import { and, count, eq, like } from "drizzle-orm";
import { DEMO_PROJECT_ID } from "../src/lib/constants";
import { db } from "../src/server/db/connection";
import { bids, partners, projects, sessions } from "../src/server/db/schema";
import { resetDemoDatabase } from "./seed";

const regressionSessionId = "session-reset-regression";
const regressionProjectId = "project-reset-regression";

async function main() {
  await db.delete(sessions).where(eq(sessions.id, regressionSessionId));
  await db.delete(projects).where(eq(projects.id, regressionProjectId));
  await db.insert(sessions).values({
    id: regressionSessionId,
    tokenHash: "reset-regression-token-hash",
    userId: "user-approver",
    expiresAt: new Date("2100-01-01T00:00:00Z"),
  });
  await db.insert(projects).values({
    id: regressionProjectId,
    organizationId: "org-reroute-demo",
    name: "초기화 회귀 검증",
    batchLabel: "임시 자산 1개",
    location: "임시",
    status: "DRAFT",
    assetCount: 1,
    minimumCashRecovery: 0,
    minimumReuseRate: 0,
    maximumPickupRounds: 1,
    updatedAt: new Date(),
  });

  await resetDemoDatabase();

  const [sessionCount] = await db
    .select({ value: count() })
    .from(sessions)
    .where(eq(sessions.id, regressionSessionId));
  const [demoProjectCount] = await db
    .select({ value: count() })
    .from(projects)
    .where(eq(projects.organizationId, "org-reroute-demo"));
  const [canonicalBidCount] = await db
    .select({ value: count() })
    .from(bids)
    .where(eq(bids.projectId, DEMO_PROJECT_ID));
  const [sampleEvidenceCount] = await db
    .select({ value: count() })
    .from(partners)
    .where(and(eq(partners.isVerified, true), like(partners.verificationReference, "SAMPLE-EVIDENCE-%")));
  const [foreignProjectCount] = await db
    .select({ value: count() })
    .from(projects)
    .where(eq(projects.id, "project-foreign-audit"));

  assert.equal(sessionCount?.value, 1, "targeted reset must preserve active sessions");
  assert.equal(demoProjectCount?.value, 1, "targeted reset must leave one canonical demo project");
  assert.equal(canonicalBidCount?.value, 11, "targeted reset must restore all sample bids");
  assert.equal(sampleEvidenceCount?.value, 7, "targeted reset must restore sanitized sample evidence references");
  assert.equal(foreignProjectCount?.value, 1, "targeted reset must preserve the isolation fixture");

  await db.delete(sessions).where(eq(sessions.id, regressionSessionId));
  console.info("Demo reset regression passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
