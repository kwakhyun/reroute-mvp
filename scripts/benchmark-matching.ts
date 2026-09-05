import { recommendMatchPlan, type CandidateBid } from "../src/server/services/matching-engine";

// Same synthetic workload used in the pre-optimization review; no database/network.
const groups = Array.from({ length: 16 }, (_, index) => ({ id: `a${index}`, quantity: 1, minimumRecovery: 0 }));
const bids: CandidateBid[] = groups.flatMap(group => [0, 1].map(candidate => ({
  id: `${group.id}-${candidate}`, assetGroupId: group.id, partnerId: `p${candidate}`,
  isPartnerVerified: true, quantity: 1, cashRecovery: candidate, costSavings: 1,
  reuseQuantity: 1, performanceLabel: "재사용", performanceRate: 100,
  pickupDate: new Date(`2026-09-${10 + candidate}T12:00:00+09:00`),
})));
for (let run = 1; run <= 3; run++) {
  const started = performance.now();
  const result = recommendMatchPlan(bids, { assetCount: 16, minimumCashRecovery: 0, minimumReuseRate: 0, maximumPickupRounds: 3 }, groups);
  console.log(JSON.stringify({ run, combinations: 65_536, durationMs: Number((performance.now() - started).toFixed(2)), netImpact: result.netImpact }));
}
