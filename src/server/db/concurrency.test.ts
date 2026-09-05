import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { createDatabase } from "./create-database";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase } from "@/server/testing/database";
import * as schema from "./schema";

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ db: null }));
import * as service from "@/server/services/matching-mutations";

let fixture: Awaited<ReturnType<typeof createTestDatabase>>;
let peer: ReturnType<typeof createClient>;
let peerDb: typeof fixture.db;
const actorA = { id: "approver-a", ipHash: "test" };
const actorB = { id: "approver-b", ipHash: "test" };
const constraints = { minimumCashRecovery: 20, minimumReuseRate: 0, maximumPickupRounds: 3 };

beforeEach(async () => {
  fixture = await createTestDatabase();
  peer = createClient({ url: fixture.url });
  peerDb = createDatabase(peer, fixture.url);
});

afterEach(async () => {
  peer?.close();
  await fixture?.close();
});

async function reviewedPlan() {
  const plan = await service.recalculateMatchPlan("project-test", constraints, actorA, fixture.db);
  const [project] = await fixture.db.select().from(schema.projects);
  return { planId: plan.planId, version: project.version };
}

async function expectNoConfirmation() {
  expect(await fixture.db.select().from(schema.pickupOperations)).toHaveLength(0);
  expect(await fixture.db.select().from(schema.settlements)).toHaveLength(0);
  expect(await fixture.db.select().from(schema.mutationReceipts)).toHaveLength(0);
  expect((await fixture.db.select().from(schema.auditLogs)).filter((log) => log.action === "MATCH_PLAN_CONFIRMED")).toHaveLength(0);
}

describe("actual matching service with independent database connections", () => {
  it("rejects A's reviewed plan after B completes a recalculation", async () => {
    const reviewed = await reviewedPlan();
    const latest = await service.recalculateMatchPlan("project-test", { ...constraints, minimumReuseRate: 80 }, actorB, peerDb);
    await expect(service.confirmMatchPlan("project-test", crypto.randomUUID(), actorA, reviewed, fixture.db)).rejects.toThrow("검토한 배분안이 변경");
    expect(await fixture.db.select().from(schema.matchPlans)).toEqual([expect.objectContaining({ id: latest.planId, status: "DRAFT" })]);
    await expectNoConfirmation();
  });

  it("rejects a stale project version even with the current plan ID", async () => {
    const reviewed = await reviewedPlan();
    await expect(service.confirmMatchPlan("project-test", crypto.randomUUID(), actorA, { ...reviewed, version: reviewed.version - 1 }, fixture.db)).rejects.toThrow("검토한 배분안이 변경");
    await expectNoConfirmation();
  });

  it("rejects confirmation when recalculation commits between its read and transaction", async () => {
    const reviewed = await reviewedPlan();
    let reachedTransaction!: () => void;
    let resumeConfirmation!: () => void;
    const reached = new Promise<void>((resolve) => { reachedTransaction = resolve; });
    const resume = new Promise<void>((resolve) => { resumeConfirmation = resolve; });
    const transaction = fixture.db.transaction.bind(fixture.db);
    // Control the request interleaving without replacing any application SQL.
    const barrier = vi.spyOn(fixture.db, "transaction").mockImplementationOnce(async (callback) => {
      reachedTransaction();
      await resume;
      return transaction(callback);
    });
    const confirmation = service.confirmMatchPlan("project-test", crypto.randomUUID(), actorA, reviewed, fixture.db);
    const rejected = expect(confirmation).rejects.toThrow(/변경|동시/);
    try {
      await reached;
      const latest = await service.recalculateMatchPlan("project-test", constraints, actorB, peerDb);
      resumeConfirmation();
      await rejected;
      expect(await fixture.db.select().from(schema.matchPlans)).toEqual([expect.objectContaining({ id: latest.planId, status: "DRAFT" })]);
      expect((await fixture.db.select().from(schema.projects))[0].version).toBe(reviewed.version + 1);
      await expectNoConfirmation();
    } finally {
      resumeConfirmation();
      await rejected;
      barrier.mockRestore();
    }
  });

  it("serializes native file writes and keeps exactly one competing mutation", async () => {
    const reviewed = await reviewedPlan();
    const results = await Promise.allSettled([
      service.confirmMatchPlan("project-test", crypto.randomUUID(), actorA, reviewed, fixture.db),
      service.recalculateMatchPlan("project-test", constraints, actorB, peerDb),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const [project] = await fixture.db.select().from(schema.projects);
    const [plan] = await fixture.db.select().from(schema.matchPlans);
    expect(project.version).toBe(reviewed.version + 1);
    if (plan.status === "DRAFT") {
      await expectNoConfirmation();
    }
    // A failed transaction must release the local queue for the next request.
    await expect(service.confirmMatchPlan("project-test", crypto.randomUUID(), actorA, { planId: plan.id, version: project.version }, fixture.db)).resolves.toMatchObject({ status: "CONFIRMED" });
    expect(await fixture.db.select().from(schema.pickupOperations)).toHaveLength(1);
    expect(await fixture.db.select().from(schema.settlements)).toHaveLength(1);
  });

  it("refuses confirmation when the reviewed plan does not meet the criteria", async () => {
    const plan = await service.recalculateMatchPlan("project-test", { ...constraints, minimumCashRecovery: 10000 }, actorA, fixture.db);
    expect(plan.criteriaPassed).toBe(false);
    const [project] = await fixture.db.select().from(schema.projects);
    await expect(service.confirmMatchPlan("project-test", crypto.randomUUID(), actorA, { planId: plan.planId, version: project.version }, fixture.db)).rejects.toThrow("확정 기준");
    await expectNoConfirmation();
  });

  it("rechecks expired partner evidence before confirming a previously valid plan", async () => {
    const reviewed = await reviewedPlan();
    await fixture.db.update(schema.partners).set({ verificationExpiresAt: new Date("2020-01-01T00:00:00+09:00") }).where(eq(schema.partners.id, "partner-test"));
    await expect(service.confirmMatchPlan("project-test", crypto.randomUUID(), actorA, reviewed, fixture.db)).rejects.toThrow("확인을 마친 인수처");
    await expectNoConfirmation();
  });

  it("keeps confirmed allocations immutable when recalculation is requested", async () => {
    const reviewed = await reviewedPlan();
    await service.confirmMatchPlan("project-test", crypto.randomUUID(), actorA, reviewed, fixture.db);
    const allocations = await fixture.db.select().from(schema.matchAllocations);
    await expect(service.recalculateMatchPlan("project-test", constraints, actorB, peerDb)).rejects.toThrow("확정된 프로젝트");
    expect(await fixture.db.select().from(schema.matchAllocations)).toEqual(allocations);
  });

  it("replays a retry without duplicate operations and rejects key reuse for another plan", async () => {
    const reviewed = await reviewedPlan();
    const key = crypto.randomUUID();
    const first = await service.confirmMatchPlan("project-test", key, actorA, reviewed, fixture.db);
    expect(await service.confirmMatchPlan("project-test", key, actorA, reviewed, fixture.db)).toEqual(first);
    await expect(service.confirmMatchPlan("project-test", key, actorA, { ...reviewed, planId: "different-plan" }, fixture.db)).rejects.toThrow("다른 작업");
    await expect(service.confirmMatchPlan("project-test", key, actorB, reviewed, peerDb)).rejects.toThrow("다른 작업");
    expect(await fixture.db.select().from(schema.pickupOperations)).toHaveLength(1);
    expect(await fixture.db.select().from(schema.settlements)).toHaveLength(1);
    expect(await fixture.db.select().from(schema.mutationReceipts)).toHaveLength(1);
  });
});
