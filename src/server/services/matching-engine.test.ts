import { describe, expect, it } from "vitest";
import {
  evaluateCombination,
  MatchingCapacityError,
  MatchingIntegrityError,
  MatchingTimeoutError,
  recommendMatchPlan,
  type CandidateBid,
  type ExpectedAssetGroup,
  type MatchingConstraints,
} from "./matching-engine";

const date = (day: number) => new Date(`2026-09-${String(day).padStart(2, "0")}T00:00:00+09:00`);
const expectedGroups: ExpectedAssetGroup[] = [
  { id: "chairs", quantity: 96 },
  { id: "monitors", quantity: 48 },
  { id: "drawers", quantity: 42 },
  { id: "tables", quantity: 28 },
];
const preferred: CandidateBid[] = [
  { id: "a1", assetGroupId: "chairs", partnerId: "p1", isPartnerVerified: true, quantity: 96, cashRecovery: 720, costSavings: 0, reuseQuantity: 96, performanceLabel: "재사용", performanceRate: 90.3, pickupDate: date(8) },
  { id: "b1", assetGroupId: "monitors", partnerId: "p2", isPartnerVerified: true, quantity: 48, cashRecovery: 640, costSavings: 0, reuseQuantity: 48, performanceLabel: "재사용", performanceRate: 100, pickupDate: date(10) },
  { id: "c1", assetGroupId: "drawers", partnerId: "p3", isPartnerVerified: true, quantity: 42, cashRecovery: 0, costSavings: 320, reuseQuantity: 42, performanceLabel: "재사용", performanceRate: 100, pickupDate: date(10) },
  { id: "d1", assetGroupId: "tables", partnerId: "p4", isPartnerVerified: true, quantity: 28, cashRecovery: 200, costSavings: 300, reuseQuantity: 0, performanceLabel: "소재 회수율", performanceRate: 92, pickupDate: date(12) },
];
const constraints: MatchingConstraints = {
  assetCount: 214,
  minimumCashRecovery: 1500,
  minimumReuseRate: 80,
  maximumPickupRounds: 3,
};

describe("matching engine", () => {
  it("keeps cash recovery and avoided costs separate", () => {
    const result = evaluateCombination(preferred, constraints);
    expect(result).toMatchObject({ cashRecovery: 1560, costSavings: 620, netImpact: 2180 });
  });

  it("excludes recycling and counts unique pickup dates", () => {
    const result = evaluateCombination(preferred, constraints);
    expect(result).toMatchObject({ reuseQuantity: 186, reuseRate: 86.9, pickupRounds: 3, criteriaPassed: true });
  });

  it("counts pickup rounds by the Seoul calendar date", () => {
    const first = { ...preferred[0], pickupDate: new Date("2026-09-08T00:30:00+09:00") };
    const second = { ...preferred[1], pickupDate: new Date("2026-09-08T23:30:00+09:00") };
    expect(evaluateCombination([first, second], { ...constraints, assetCount: 144 })).toMatchObject({ pickupRounds: 1 });
  });

  it("uses the aggregate asset recovery amount as the batch cash floor", () => {
    const groupsWithFloor = expectedGroups.map((group, index) => ({
      ...group,
      minimumRecovery: [600, 480, 420, 240][index],
    }));
    expect(recommendMatchPlan(preferred, constraints, groupsWithFloor).criteriaPassed).toBe(false);
  });

  it("prefers a qualifying combination before a higher-value failing one", () => {
    const nonQualifying = { ...preferred[0], id: "a2", cashRecovery: 1200, reuseQuantity: 0, pickupDate: date(15) };
    const result = recommendMatchPlan([...preferred, nonQualifying], constraints, expectedGroups);
    expect(result.bids.map((bid) => bid.id)).toContain("a1");
  });

  it("requires every expected asset group rather than accepting only a matching total", () => {
    const forged = [
      { ...preferred[0], quantity: 172 },
      { ...preferred[3], quantity: 42 },
    ];
    expect(() => recommendMatchPlan(forged, constraints, expectedGroups)).toThrow(MatchingIntegrityError);
    expect(() => recommendMatchPlan(preferred.slice(0, 3), constraints, expectedGroups)).toThrow(
      "Every asset group needs at least one verified partner bid",
    );
  });

  it("rejects unknown groups, quantity mismatches, and unverified-only candidates", () => {
    expect(() => recommendMatchPlan([{ ...preferred[0], assetGroupId: "unknown" }, ...preferred.slice(1)], constraints, expectedGroups)).toThrow("Every bid must reference");
    expect(() => recommendMatchPlan([{ ...preferred[0], quantity: 95 }, ...preferred.slice(1)], constraints, expectedGroups)).toThrow("complete asset group quantity");
    expect(() => recommendMatchPlan([{ ...preferred[0], isPartnerVerified: false }, ...preferred.slice(1)], constraints, expectedGroups)).toThrow("verified partner bid");
  });

  it("fails fast when the bounded search space is exceeded", () => {
    const groups = [{ id: "one", quantity: 5 }, { id: "two", quantity: 5 }];
    const base: CandidateBid = { id: "base", assetGroupId: "one", partnerId: "p", isPartnerVerified: true, quantity: 5, cashRecovery: 1, costSavings: 0, reuseQuantity: 5, performanceLabel: "재사용", performanceRate: 100, pickupDate: date(8) };
    const bids = [0, 1, 2].flatMap((index) => [
      { ...base, id: `one-${index}` },
      { ...base, id: `two-${index}`, assetGroupId: "two" },
    ]);
    expect(() => recommendMatchPlan(bids, { ...constraints, assetCount: 10 }, groups, { maxCombinations: 8 })).toThrow(MatchingCapacityError);
  });

  it("stops when the synchronous runtime budget is exhausted", () => {
    expect(() => recommendMatchPlan(preferred, constraints, expectedGroups, { maxRuntimeMs: -1 })).toThrow(MatchingTimeoutError);
  });

  it("uses value and ID as deterministic tie breakers", () => {
    const base: CandidateBid = { id: "base", assetGroupId: "only", partnerId: "partner", isPartnerVerified: true, quantity: 10, cashRecovery: 100, costSavings: 0, reuseQuantity: 10, performanceLabel: "재사용", performanceRate: 100, pickupDate: date(8) };
    const open = { assetCount: 10, minimumCashRecovery: 0, minimumReuseRate: 0, maximumPickupRounds: 5 };
    const groups = [{ id: "only", quantity: 10 }];
    expect(recommendMatchPlan([base, { ...base, id: "higher", cashRecovery: 101 }], open, groups).bids[0].id).toBe("higher");
    expect(recommendMatchPlan([{ ...base, id: "z-last" }, { ...base, id: "a-first" }], open, groups).bids[0].id).toBe("a-first");
  });
});
