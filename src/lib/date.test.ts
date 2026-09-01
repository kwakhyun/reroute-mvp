import { describe, expect, it } from "vitest";
import { fromSeoulDateKey, toSeoulDateKey } from "./date";

describe("Seoul date keys", () => {
  it("keeps a KST calendar day even when UTC is the previous day", () => {
    expect(toSeoulDateKey(new Date("2026-09-08T00:30:00+09:00"))).toBe("2026-09-08");
  });

  it("round-trips a valid calendar date at a DST-independent time", () => {
    expect(toSeoulDateKey(fromSeoulDateKey("2026-09-30"))).toBe("2026-09-30");
  });

  it("rejects impossible calendar dates", () => {
    expect(() => fromSeoulDateKey("2026-02-30")).toThrow(TypeError);
  });
});
