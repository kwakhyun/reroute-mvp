import { describe, expect, it } from "vitest";
import { AuthorizationError } from "./errors";
import { assertMembershipRole } from "./access-policy";

describe("assertMembershipRole", () => {
  it("allows a role explicitly granted by the organization", () => {
    expect(() => assertMembershipRole("MANAGER", ["MANAGER", "APPROVER"])).not.toThrow();
  });

  it("rejects a global-looking role when the membership role is insufficient", () => {
    expect(() => assertMembershipRole("VIEWER", ["MANAGER", "APPROVER"])).toThrow(AuthorizationError);
  });
});
