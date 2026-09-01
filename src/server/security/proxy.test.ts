import { describe, expect, it } from "vitest";
import { resolveClientAddress } from "./proxy";

function header(values: Record<string, string>): Pick<Headers, "get"> {
  return { get: (name) => values[name.toLowerCase()] ?? null };
}

describe("proxy address resolution", () => {
  it("does not trust client-supplied forwarding headers by default", () => {
    expect(resolveClientAddress(header({ "x-forwarded-for": "203.0.113.10" }), {})).toBe("untrusted-proxy");
  });

  it("uses only the first hop behind an explicitly trusted proxy", () => {
    expect(
      resolveClientAddress(
        header({ "x-forwarded-for": "203.0.113.10, 10.0.0.2" }),
        { TRUST_PROXY_HEADERS: "true" },
      ),
    ).toBe("203.0.113.10");
  });
});
