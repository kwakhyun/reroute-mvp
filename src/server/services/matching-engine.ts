import { toSeoulDateKey } from "@/lib/date";

export const MAX_MATCH_COMBINATIONS = 100_000;

export class MatchingIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MatchingIntegrityError";
  }
}

export class MatchingCapacityError extends Error {
  constructor(public readonly combinationCount: number, public readonly limit: number) {
    super(`Matching search space ${combinationCount} exceeds limit ${limit}`);
    this.name = "MatchingCapacityError";
  }
}

export class MatchingTimeoutError extends Error {
  constructor() {
    super("Matching calculation exceeded its synchronous time budget");
    this.name = "MatchingTimeoutError";
  }
}

export type ExpectedAssetGroup = {
  id: string;
  quantity: number;
  minimumRecovery?: number;
};

export type CandidateBid = {
  id: string;
  assetGroupId: string;
  partnerId: string;
  isPartnerVerified: boolean;
  quantity: number;
  cashRecovery: number;
  costSavings: number;
  reuseQuantity: number;
  performanceLabel: string;
  performanceRate: number;
  pickupDate: Date;
};

export type MatchingConstraints = {
  assetCount: number;
  minimumCashRecovery: number;
  minimumReuseRate: number;
  maximumPickupRounds: number;
};

export type MatchEvaluation = {
  bids: CandidateBid[];
  cashRecovery: number;
  costSavings: number;
  netImpact: number;
  reuseQuantity: number;
  reuseRate: number;
  pickupRounds: number;
  cashPassed: boolean;
  reusePassed: boolean;
  pickupPassed: boolean;
  criteriaPassed: boolean;
};

function validateAndGroupBids(bids: CandidateBid[], expectedGroups: ExpectedAssetGroup[], assetCount: number) {
  if (expectedGroups.length === 0) {
    throw new MatchingIntegrityError("At least one asset group is required");
  }

  const expectedById = new Map<string, ExpectedAssetGroup>();
  for (const group of expectedGroups) {
    if (group.quantity <= 0 || expectedById.has(group.id)) {
      throw new MatchingIntegrityError("Asset groups must be unique and have a positive quantity");
    }
    expectedById.set(group.id, group);
  }

  const expectedTotal = expectedGroups.reduce((sum, group) => sum + group.quantity, 0);
  if (expectedTotal !== assetCount) {
    throw new MatchingIntegrityError("Asset group quantities must equal the project asset count");
  }

  const seenBidIds = new Set<string>();
  const bidsByGroup = new Map(expectedGroups.map((group) => [group.id, [] as CandidateBid[]]));
  for (const bid of bids) {
    if (seenBidIds.has(bid.id)) {
      throw new MatchingIntegrityError("Bid identifiers must be unique");
    }
    seenBidIds.add(bid.id);

    const expected = expectedById.get(bid.assetGroupId);
    if (!expected) {
      throw new MatchingIntegrityError("Every bid must reference an expected asset group");
    }
    if (bid.quantity !== expected.quantity) {
      throw new MatchingIntegrityError("Every bid must cover its complete asset group quantity");
    }
    if (!bid.isPartnerVerified) {
      continue;
    }
    bidsByGroup.get(bid.assetGroupId)?.push(bid);
  }

  return expectedGroups.map((group) => {
    const groupBids = bidsByGroup.get(group.id) ?? [];
    if (groupBids.length === 0) {
      throw new MatchingIntegrityError("Every asset group needs at least one verified partner bid");
    }
    return groupBids.sort((left, right) => left.id.localeCompare(right.id));
  });
}

export function evaluateCombination(
  selectedBids: CandidateBid[],
  constraints: MatchingConstraints,
): MatchEvaluation {
  let cashRecovery = 0;
  let costSavings = 0;
  let reuseQuantity = 0;
  const pickupDates = new Set<string>();

  for (const bid of selectedBids) {
    cashRecovery += bid.cashRecovery;
    costSavings += bid.costSavings;
    reuseQuantity += bid.reuseQuantity;
    pickupDates.add(toSeoulDateKey(bid.pickupDate));
  }

  const reuseRate = Number(((reuseQuantity / constraints.assetCount) * 100).toFixed(1));
  const pickupRounds = pickupDates.size;
  const cashPassed = cashRecovery >= constraints.minimumCashRecovery;
  const reusePassed = reuseRate >= constraints.minimumReuseRate;
  const pickupPassed = pickupRounds <= constraints.maximumPickupRounds;

  return {
    bids: selectedBids,
    cashRecovery,
    costSavings,
    netImpact: cashRecovery + costSavings,
    reuseQuantity,
    reuseRate,
    pickupRounds,
    cashPassed,
    reusePassed,
    pickupPassed,
    criteriaPassed: cashPassed && reusePassed && pickupPassed,
  };
}

function compareEvaluations(left: MatchEvaluation, right: MatchEvaluation) {
  if (left.criteriaPassed !== right.criteriaPassed) {
    return left.criteriaPassed ? -1 : 1;
  }
  if (left.netImpact !== right.netImpact) {
    return right.netImpact - left.netImpact;
  }
  if (left.reuseRate !== right.reuseRate) {
    return right.reuseRate - left.reuseRate;
  }
  if (left.pickupRounds !== right.pickupRounds) {
    return left.pickupRounds - right.pickupRounds;
  }
  if (left.cashRecovery !== right.cashRecovery) {
    return right.cashRecovery - left.cashRecovery;
  }

  const leftKey = left.bids.map((bid) => bid.id).sort().join(":");
  const rightKey = right.bids.map((bid) => bid.id).sort().join(":");
  return leftKey.localeCompare(rightKey);
}

export function recommendMatchPlan(
  bids: CandidateBid[],
  constraints: MatchingConstraints,
  expectedGroups: ExpectedAssetGroup[],
  options: { maxCombinations?: number; maxRuntimeMs?: number } = {},
): MatchEvaluation {
  if (constraints.assetCount <= 0) {
    throw new MatchingIntegrityError("assetCount must be greater than zero");
  }

  const assetRecoveryFloor = expectedGroups.reduce((sum, group) => sum + (group.minimumRecovery ?? 0), 0);
  const effectiveConstraints = {
    ...constraints,
    minimumCashRecovery: Math.max(constraints.minimumCashRecovery, assetRecoveryFloor),
  };
  const groups = validateAndGroupBids(bids, expectedGroups, constraints.assetCount);
  const maxCombinations = options.maxCombinations ?? MAX_MATCH_COMBINATIONS;
  const combinationCount = groups.reduce((total, group) => total * group.length, 1);
  if (!Number.isSafeInteger(combinationCount) || combinationCount > maxCombinations) {
    throw new MatchingCapacityError(combinationCount, maxCombinations);
  }
  const deadline = performance.now() + (options.maxRuntimeMs ?? 1_500);

  let recommendation: MatchEvaluation | null = null;
  const selected: CandidateBid[] = [];
  const visit = (groupIndex: number) => {
    if (performance.now() > deadline) throw new MatchingTimeoutError();
    if (groupIndex === groups.length) {
      const evaluation = evaluateCombination([...selected], effectiveConstraints);
      if (!recommendation || compareEvaluations(evaluation, recommendation) < 0) {
        recommendation = evaluation;
      }
      return;
    }

    for (const bid of groups[groupIndex]) {
      selected.push(bid);
      visit(groupIndex + 1);
      selected.pop();
    }
  };

  visit(0);
  if (!recommendation) {
    throw new MatchingIntegrityError("No bid combination covers the full asset batch");
  }
  return recommendation;
}
