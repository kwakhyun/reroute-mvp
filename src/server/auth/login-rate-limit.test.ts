import { describe, expect, it } from "vitest";
import { isLoginRateLimited } from "./login-rate-limit";

describe("login rate limit", () => {
  it("allows the first five failures and blocks the next attempt", () => {
    expect(isLoginRateLimited(4)).toBe(false);
    expect(isLoginRateLimited(5)).toBe(true);
    expect(isLoginRateLimited(12)).toBe(true);
  });
});
