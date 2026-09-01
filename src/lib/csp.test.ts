import { describe, expect, it } from "vitest";
import { createContentSecurityPolicy } from "./csp";

describe("content security policy", () => {
  it("uses a nonce without allowing inline production scripts", () => {
    const value = createContentSecurityPolicy("abc123", false);
    const scriptDirective = value.split("; ").find((directive) => directive.startsWith("script-src"));
    expect(scriptDirective).toContain("'nonce-abc123'");
    expect(scriptDirective).not.toContain("'unsafe-inline'");
    expect(scriptDirective).not.toContain("'unsafe-eval'");
    expect(value).toContain("style-src 'self' 'nonce-abc123'");
    expect(value).toContain("style-src-attr 'unsafe-inline'");
  });

  it("allows eval only for the development runtime", () => {
    expect(createContentSecurityPolicy("abc123", true)).toContain("'unsafe-eval'");
  });
});
