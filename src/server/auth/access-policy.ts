import type { UserRole } from "@/server/db/schema";
import { AuthorizationError } from "./errors";

export function assertMembershipRole(actualRole: UserRole, allowedRoles: readonly UserRole[]) {
  if (!allowedRoles.includes(actualRole)) {
    throw new AuthorizationError();
  }
}
