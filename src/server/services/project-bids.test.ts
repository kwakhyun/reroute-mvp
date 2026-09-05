import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase } from "@/server/testing/database";
import { bids, organizationMemberships } from "@/server/db/schema";

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/session", () => ({ requireUser: async () => ({ id: "approver-a" }) }));
let fixture: Awaited<ReturnType<typeof createTestDatabase>>;
let queries: typeof import("./project-bids");
let dashboard: typeof import("./dashboard");
beforeEach(async () => {
  fixture = await createTestDatabase();
  vi.resetModules();
  vi.doMock("@/server/db/client", () => ({ db: fixture.db }));
  queries = await import("./project-bids");
  dashboard = await import("./dashboard");
  const [base] = await fixture.db.select().from(bids);
  await fixture.db.insert(bids).values(Array.from({ length: 119 }, (_, i) => ({ ...base, id: `extra-${String(i).padStart(3, "0")}` })));
  const { recalculateMatchPlan } = await import("./matching-mutations");
  await recalculateMatchPlan("project-test", { minimumCashRecovery: 20, minimumReuseRate: 0, maximumPickupRounds: 3 }, { id: "approver-a", ipHash: "test" });
});
afterEach(async () => { await fixture.close(); vi.doUnmock("@/server/db/client"); });

describe("project-scoped read models", () => {
  it("pages ties deterministically, clamps page numbers, and exports the full dataset", async () => {
    const first = await queries.getProjectBidPage("project-test");
    const second = await queries.getProjectBidPage("project-test", { page: 2 });
    const last = await queries.getProjectBidPage("project-test", { page: 9999 });
    expect(first).toMatchObject({ total: 121, page: 1, pageCount: 3 });
    expect(first.rows).toHaveLength(50);
    expect(second.rows).toHaveLength(50);
    expect(last.rows).toHaveLength(21);
    expect(new Set([...first.rows, ...second.rows, ...last.rows].map(row => row.id)).size).toBe(121);
    expect((await queries.getProjectBidPage("project-test", { page: -1 })).page).toBe(1);
    expect((await queries.getProjectBidPage("project-test", { page: Infinity })).page).toBe(1);
    expect(await queries.getProjectBids("project-test")).toHaveLength(121);
  });
  it("combines asset and selected-plan filters without changing export scope", async () => {
    const selected = await queries.getProjectBidPage("project-test", { selectedOnly: true });
    expect(selected.total).toBe(2);
    expect(selected.rows.every(row => row.isSelected)).toBe(true);
    const filtered = await queries.getProjectBidPage("project-test", { assetGroupId: fixture.assets[1].id, selectedOnly: true });
    expect(filtered.rows).toHaveLength(1);
    expect(filtered.rows[0].assetGroupId).toBe(fixture.assets[1].id);
    expect(await queries.getProjectBidPage("project-test", { assetGroupId: "foreign-asset" })).toMatchObject({ total: 0, page: 1, pageCount: 1, rows: [] });
    expect(await queries.getProjectBids("project-test")).toHaveLength(121);
  });
  it("returns narrow asset, summary and pickup models consistent with the full dashboard", async () => {
    const full = await dashboard.getMatchingDashboard("project-test");
    const assets = await dashboard.getProjectAssets("project-test");
    const summary = await dashboard.getProjectPlanSummary("project-test");
    const pickup = await dashboard.getPickupDashboard("project-test");
    expect(assets.assets).toEqual(full.assets);
    expect(assets).not.toHaveProperty("allocations");
    expect(summary.plan).toEqual(full.plan);
    expect(summary).not.toHaveProperty("assets");
    expect(pickup.allocations.map(row => row.bidId)).toEqual(full.allocations.map(row => row.bidId));
  });
  it("retains organization authorization for lists, filters and narrow queries", async () => {
    await fixture.db.delete(organizationMemberships).where(eq(organizationMemberships.userId, "approver-a"));
    for (const query of [queries.getProjectBidPage, queries.getProjectBids, dashboard.getProjectAssets, dashboard.getProjectPlanSummary, dashboard.getPickupDashboard]) {
      await expect(query("project-test")).rejects.toThrow();
    }
  });
});
