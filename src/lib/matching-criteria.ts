export function meetsMinimumReuseRate(reuseQuantity: number, assetCount: number, minimumReuseRate: number) {
  const actual = reuseQuantity * 100;
  const required = minimumReuseRate * assetCount;
  // Decimal thresholds (for example, 8.8%) can add a floating-point rounding
  // error to the product. Tolerate that error without rounding a displayed rate.
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(actual), Math.abs(required));
  return assetCount > 0 && actual >= required - tolerance;
}
