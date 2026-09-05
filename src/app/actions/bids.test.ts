import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase } from "@/server/testing/database";
import { BID_IMPORT_HEADERS } from "@/lib/bid-import";
import { initialBidImportActionState } from "@/lib/bid-import-action-state";
import { assetGroups, bids, matchPlans, partners, projects } from "@/server/db/schema";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers(), cookies: async () => ({}) }));
const identity = vi.hoisted(() => ({ userId: "approver-a" }));
vi.mock("@/server/auth/session", () => ({ requireUser: async () => ({ id: identity.userId }) }));

let fixture: Awaited<ReturnType<typeof createTestDatabase>>;
let action: typeof import("./bids").importBidsAction;
let matching: typeof import("@/server/services/matching-mutations");

beforeEach(async () => {
  fixture = await createTestDatabase();
  identity.userId = "approver-a";
  vi.stubEnv("SESSION_PEPPER", "test-only-preview-pepper-with-more-than-32-characters");
  vi.resetModules();
  vi.doMock("@/server/db/client", () => ({ db: fixture.db }));
  action = (await import("./bids")).importBidsAction;
  matching = await import("@/server/services/matching-mutations");
  await matching.recalculateMatchPlan("project-test", { minimumCashRecovery: 20, minimumReuseRate: 0, maximumPickupRounds: 3 }, { id: identity.userId, ipHash: "test" });
});

afterEach(async () => {
  await fixture?.close();
  vi.unstubAllEnvs();
  vi.doUnmock("@/server/db/client");
});

function csv(rows = fixture.assets.map((asset) => [asset.id, asset.name, "인수처", "BUSINESS", "서류 확인", "reference-shared", "2035-09-01", "1", "20", "0", "1", "재사용", "100", "2030-09-15"])) {
  return `${BID_IMPORT_HEADERS.join(",")}\n${rows.map((row) => row.join(",")).join("\n")}`;
}
function request(source = csv(), intent = "preview", token = "") {
  const data = new FormData();
  data.set("projectId", "project-test");
  data.set("intent", intent);
  data.set("previewToken", token);
  data.set("bidFile", new File([source], "bids.csv", { type: "text/csv" }));
  return data;
}
async function snapshot() {
  return {
    project: await fixture.db.select().from(projects),
    bids: await fixture.db.select().from(bids),
    plans: await fixture.db.select().from(matchPlans),
    partners: await fixture.db.select().from(partners),
  };
}
async function previewToken(source = csv()) {
  const state = await action(initialBidImportActionState, request(source));
  expect(state.status).toBe("preview");
  if (state.status !== "preview") throw new Error("Expected preview");
  return state.preview.token;
}

describe("CSV preview and commit through the actual server action", () => {
  it("imports 5,000 rows with mixed existing and new partners, and rolls back a failed batch", async () => {
    const makeSource = (replaceHalf: boolean) => csv(Array.from({ length: 5000 }, (_, index) => {
      const asset = fixture.assets[index === 4999 ? 1 : 0];
      const reference = replaceHalf && index >= 2500 ? `new-${index}` : `bulk-${index}`;
      return [asset.id, asset.name, `${replaceHalf ? "갱신" : "최초"} 인수처 ${index}`, "BUSINESS", "서류 확인", reference, "2035-09-01", "1", "20", "0", "1", "재사용", "100", "2030-09-15"];
    }));
    const source = makeSource(false);
    expect(await action(initialBidImportActionState, request(source, "commit", await previewToken(source)))).toMatchObject({ status: "success" });
    expect(await fixture.db.select().from(bids)).toHaveLength(5000);
    const changed = makeSource(true);
    const token = await previewToken(changed);
    const before = await snapshot();
    // Fail during bid insertion, after partner upserts and deletion of old bids.
    await fixture.client.execute("CREATE TRIGGER reject_import BEFORE INSERT ON bids BEGIN SELECT RAISE(ABORT, 'fixture failure'); END");
    expect(await action(initialBidImportActionState, request(changed, "commit", token))).toMatchObject({ status: "error" });
    expect(await snapshot()).toEqual(before);
    await fixture.client.execute("DROP TRIGGER reject_import");
    expect(await action(initialBidImportActionState, request(changed, "commit", token))).toMatchObject({ status: "success" });
    expect(await fixture.db.select().from(bids)).toHaveLength(5000);
    const saved = await fixture.db.select().from(partners);
    expect(saved.filter((partner) => partner.name.startsWith("갱신"))).toHaveLength(5000);
    expect(saved.some((partner) => partner.verificationReference === "new-4999")).toBe(true);
  }, 90_000);

  it("previews without mutation, then replaces exactly the reviewed input", async () => {
    const before = await snapshot();
    const preview = await action(initialBidImportActionState, request());
    expect(preview).toMatchObject({ status: "preview", preview: { existingBidCount: 2, incomingBidCount: 2, invalidatedDraftCount: 1, combinationCount: 1, canImport: true, criteriaPassed: true } });
    expect(await snapshot()).toEqual(before);
    if (preview.status !== "preview") throw new Error("Expected preview");
    expect(await action(initialBidImportActionState, request(csv(), "commit", preview.preview.token))).toMatchObject({ status: "success" });
    expect(await fixture.db.select().from(matchPlans)).toHaveLength(0);
    expect((await fixture.db.select().from(bids)).map((bid) => bid.cashRecovery)).toEqual([20, 20]);
    // Replaying the old preview cannot overwrite another import.
    expect(await action(initialBidImportActionState, request(csv(), "commit", preview.preview.token))).toMatchObject({ status: "error" });
  });

  it.each(["missing", "tampered", "file", "project", "actor", "expired"])("rejects a %s preview without changing data", async (change) => {
    let token = await previewToken();
    let source = csv();
    if (change === "missing") token = "";
    if (change === "tampered") token = `${token.slice(0, -1)}${token.endsWith("0") ? "1" : "0"}`;
    if (change === "file") source = source.replace(",20,0,", ",21,0,");
    if (change === "project") await matching.recalculateMatchPlan("project-test", { minimumCashRecovery: 20, minimumReuseRate: 80, maximumPickupRounds: 3 }, { id: "approver-b", ipHash: "test" });
    if (change === "actor") identity.userId = "approver-b";
    if (change === "expired") {
      const realNow = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(realNow + 16 * 60 * 1000);
    }
    const before = await snapshot();
    try {
      expect(await action(initialBidImportActionState, request(source, "commit", token))).toMatchObject({ status: "error", message: expect.stringContaining("미리보기") });
      expect(await snapshot()).toEqual(before);
    } finally { vi.restoreAllMocks(); }
  });

  it.each([false, true])("rejects conflicting evidence expiry regardless of row order (reversed=%s)", async (reverse) => {
    const rows = csv().split("\n").slice(1).map((row) => row.split(","));
    rows[1][6] = "";
    if (reverse) rows.reverse();
    const before = await snapshot();
    expect(await action(initialBidImportActionState, request(csv(rows)))).toMatchObject({ status: "error", message: expect.stringContaining("만료일") });
    expect(await snapshot()).toEqual(before);
  });

  it.each(["VIEWER", "MANAGER"] as const)("denies preview and commit to %s", async (role) => {
    const token = await previewToken();
    const { organizationMemberships } = await import("@/server/db/schema");
    await fixture.db.update(organizationMemberships).set({ role }).where(eq(organizationMemberships.userId, identity.userId));
    const before = await snapshot();
    expect(await action(initialBidImportActionState, request())).toMatchObject({ status: "error" });
    expect(await action(initialBidImportActionState, request(csv(), "commit", token))).toMatchObject({ status: "error" });
    expect(await snapshot()).toEqual(before);
  });

  it("blocks a preview that exceeds the computation time budget", async () => {
    const before = await snapshot();
    const clock = vi.spyOn(performance, "now").mockReturnValueOnce(0).mockReturnValue(2000);
    try {
      expect(await action(initialBidImportActionState, request())).toMatchObject({ status: "preview", preview: { canImport: false, token: "", message: expect.stringContaining("계산 시간") } });
      expect(await snapshot()).toEqual(before);
    } finally { clock.mockRestore(); }
  });

  it("keeps existing data when 17 asset groups with two candidates exceed the search limit", async () => {
    const more = Array.from({ length: 15 }, (_, index) => ({ ...fixture.assets[0], id: `extra-${index}`, name: `추가 의자 ${index}`, displayOrder: index + 2 }));
    await fixture.db.insert(assetGroups).values(more);
    await fixture.db.update(projects).set({ assetCount: 17 }).where(eq(projects.id, "project-test"));
    const rows = [...fixture.assets, ...more].flatMap((asset) => ["A", "B"].map((partner) => [asset.id, asset.name, `인수처 ${partner}`, "BUSINESS", "서류 확인", `reference-${partner}`, "2035-09-01", "1", "20", "0", "1", "재사용", "100", "2030-09-15"]));
    const before = await snapshot();
    expect(await action(initialBidImportActionState, request(csv(rows)))).toMatchObject({ status: "preview", preview: { combinationCount: 131072, canImport: false, token: "" } });
    expect(await snapshot()).toEqual(before);
  });

  it("rechecks partner expiry at commit even with a valid preview", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2030-09-05T23:59:00+09:00"));
    const source = csv().replaceAll("2035-09-01", "2030-09-05");
    const token = await previewToken(source);
    const before = await snapshot();
    vi.setSystemTime(new Date("2030-09-06T00:01:00+09:00"));
    try {
      expect(await action(initialBidImportActionState, request(source, "commit", token))).toMatchObject({ status: "error", message: expect.stringContaining("만료되었습니다") });
      expect(await snapshot()).toEqual(before);
    } finally { vi.useRealTimers(); }
  });

  it("rejects cross-project requests before previewing", async () => {
    const data = request();
    data.set("projectId", "project-foreign");
    expect(await action(initialBidImportActionState, data)).toMatchObject({ status: "error" });
    expect(await fixture.db.select().from(matchPlans).where(and(eq(matchPlans.projectId, "project-test"), eq(matchPlans.status, "DRAFT")))).toHaveLength(1);
  });
});
