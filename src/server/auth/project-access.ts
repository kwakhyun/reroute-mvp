import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { organizationMemberships, projects, type UserRole } from "@/server/db/schema";
import { assertMembershipRole } from "./access-policy";
import { ProjectNotFoundError } from "./errors";
import { requireUser } from "./session";

export async function getProjectAccess(projectId: string) {
  const user = await requireUser();
  const [access] = await db
    .select({ project: projects, membership: organizationMemberships })
    .from(projects)
    .innerJoin(
      organizationMemberships,
      and(
        eq(organizationMemberships.organizationId, projects.organizationId),
        eq(organizationMemberships.userId, user.id),
      ),
    )
    .where(eq(projects.id, projectId))
    .limit(1);

  return access ? { ...access, user } : null;
}

export async function requireProjectAccess(projectId: string, allowedRoles?: readonly UserRole[]) {
  const access = await getProjectAccess(projectId);
  if (!access) {
    throw new ProjectNotFoundError();
  }
  if (allowedRoles) {
    assertMembershipRole(access.membership.role, allowedRoles);
  }
  return access;
}
