import "server-only";

import { and, asc, count, desc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { requireUser } from "@/server/auth/session";
import { requireProjectAccess } from "@/server/auth/project-access";
import {
  assetGroups,
  auditLogs,
  bids,
  matchAllocations,
  matchPlans,
  organizationMemberships,
  organizations,
  partners,
  pickupOperations,
  projects,
  settlements,
  users,
} from "@/server/db/schema";
import { isPartnerEvidenceCurrent } from "@/server/services/matching-policies";

export async function getProject(projectId: string) {
  const access = await requireProjectAccess(projectId);
  return access.project;
}

export async function getProjectList() {
  const user = await requireUser();
  const projectRows = await db
    .select({ project: projects, membershipRole: organizationMemberships.role, plan: matchPlans })
    .from(projects)
    .innerJoin(
      organizationMemberships,
      and(
        eq(organizationMemberships.organizationId, projects.organizationId),
        eq(organizationMemberships.userId, user.id),
      ),
    )
    .leftJoin(matchPlans, eq(matchPlans.projectId, projects.id))
    .orderBy(desc(projects.updatedAt), desc(matchPlans.createdAt));

  const latestProjectRows = new Map<string, (typeof projectRows)[number]>();
  for (const row of projectRows) {
    if (!latestProjectRows.has(row.project.id)) latestProjectRows.set(row.project.id, row);
  }

  return [...latestProjectRows.values()].map(({ project, membershipRole, plan }) => {
    return {
      ...project,
      membershipRole,
      updatedAt: project.updatedAt.toISOString(),
      plan: plan
        ? {
            cashRecovery: plan.cashRecovery,
            netImpact: plan.netImpact,
            reuseRate: plan.reuseRate,
            pickupRounds: plan.pickupRounds,
            status: plan.status,
          }
        : null,
    };
  });
}

export async function getDefaultProjectNavigation() {
  const user = await requireUser();
  const [project] = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .innerJoin(
      organizationMemberships,
      and(
        eq(organizationMemberships.organizationId, projects.organizationId),
        eq(organizationMemberships.userId, user.id),
      ),
    )
    .orderBy(desc(projects.updatedAt))
    .limit(1);

  return project ?? null;
}

export async function getProjectCreationOrganizations() {
  const user = await requireUser();
  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      role: organizationMemberships.role,
    })
    .from(organizationMemberships)
    .innerJoin(organizations, eq(organizationMemberships.organizationId, organizations.id))
    .where(eq(organizationMemberships.userId, user.id))
    .orderBy(asc(organizations.name));
}

function latestPlanQuery(projectId: string) {
  return db.select().from(matchPlans).where(eq(matchPlans.projectId, projectId))
    .orderBy(desc(matchPlans.confirmedAt), desc(matchPlans.createdAt)).limit(1);
}

function allocationQuery(projectId: string) {
  const latestPlanId = db
    .select({ id: matchPlans.id })
    .from(matchPlans)
    .where(eq(matchPlans.projectId, projectId))
    .orderBy(desc(matchPlans.confirmedAt), desc(matchPlans.createdAt))
    .limit(1);
  return db
      .select({
        id: matchAllocations.id,
        bidId: matchAllocations.bidId,
        quantity: matchAllocations.quantity,
        cashRecovery: matchAllocations.cashRecovery,
        costSavings: matchAllocations.costSavings,
        performanceLabel: matchAllocations.performanceLabel,
        performanceRate: matchAllocations.performanceRate,
        pickupDate: matchAllocations.pickupDate,
        assetGroupId: assetGroups.id,
        assetGroupName: assetGroups.name,
        assetDisplayOrder: assetGroups.displayOrder,
        partnerId: partners.id,
        partnerName: partners.name,
        partnerType: partners.type,
        verificationLabel: partners.verificationLabel,
        verificationReference: partners.verificationReference,
        verifiedAt: partners.verifiedAt,
        verificationExpiresAt: partners.verificationExpiresAt,
        isVerified: partners.isVerified,
      })
      .from(matchAllocations)
      .innerJoin(bids, eq(matchAllocations.bidId, bids.id))
      .innerJoin(assetGroups, eq(bids.assetGroupId, assetGroups.id))
      .innerJoin(partners, eq(matchAllocations.partnerId, partners.id))
      .where(eq(matchAllocations.matchPlanId, latestPlanId))
      .orderBy(asc(assetGroups.displayOrder), asc(partners.name));
}

function serializePlan(plan: typeof matchPlans.$inferSelect | undefined) {
  return plan ? { ...plan, createdAt: plan.createdAt.toISOString(), confirmedAt: plan.confirmedAt?.toISOString() ?? null } : null;
}

function serializeProject(project: typeof projects.$inferSelect) {
  return { ...project, updatedAt: project.updatedAt.toISOString() };
}

export async function getProjectAssets(projectId: string) {
  const { project, membership } = await requireProjectAccess(projectId);
  const assets = await db.select().from(assetGroups).where(eq(assetGroups.projectId, projectId)).orderBy(asc(assetGroups.displayOrder));
  return { project: serializeProject(project), membershipRole: membership.role, assets };
}

export async function getProjectPlanSummary(projectId: string) {
  const { project, membership } = await requireProjectAccess(projectId);
  const [plan] = await latestPlanQuery(projectId);
  return { project: serializeProject(project), membershipRole: membership.role, plan: serializePlan(plan) };
}

export async function getPickupDashboard(projectId: string) {
  const { project, membership } = await requireProjectAccess(projectId);
  const [plans, rows] = await db.batch([latestPlanQuery(projectId), allocationQuery(projectId)]);
  return { project: serializeProject(project), membershipRole: membership.role, plan: serializePlan(plans[0]), allocations: rows.map((row) => ({
    ...row, isVerified: isPartnerEvidenceCurrent(row), pickupDate: row.pickupDate.toISOString(),
  })) };
}

export async function getMatchingDashboard(projectId: string) {
  const { project, membership } = await requireProjectAccess(projectId);
  const [assets, bidCountResult, plans, allocationRows] = await db.batch([
    db.select().from(assetGroups).where(eq(assetGroups.projectId, projectId)).orderBy(asc(assetGroups.displayOrder)),
    db.select({ count: count() }).from(bids).where(eq(bids.projectId, projectId)),
    latestPlanQuery(projectId),
    allocationQuery(projectId),
  ]);

  const plan = plans[0] ?? null;
  const allocations = plan ? allocationRows : [];

  return {
    project: {
      ...project,
      updatedAt: project.updatedAt.toISOString(),
    },
    membershipRole: membership.role,
    assets,
    plan: plan
      ? {
          ...plan,
          createdAt: plan.createdAt.toISOString(),
          confirmedAt: plan.confirmedAt?.toISOString() ?? null,
        }
      : null,
    allocations: allocations.map((allocation) => ({
      ...allocation,
      isVerified: isPartnerEvidenceCurrent(allocation),
      pickupDate: allocation.pickupDate.toISOString(),
      verifiedAt: allocation.verifiedAt?.toISOString() ?? null,
      verificationExpiresAt: allocation.verificationExpiresAt?.toISOString() ?? null,
    })),
    bidCount: bidCountResult[0]?.count ?? 0,
  };
}

export { getProjectBids } from "./project-bids";

export async function getProjectAuditLog(projectId: string, limit = 20) {
  await requireProjectAccess(projectId, ["MANAGER", "APPROVER"]);
  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      metadataJson: auditLogs.metadataJson,
      createdAt: auditLogs.createdAt,
      actorName: users.name,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorUserId, users.id))
    .where(and(eq(auditLogs.entityType, "PROJECT"), eq(auditLogs.entityId, projectId)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    actorName: row.actorName ?? "시스템",
    metadata: JSON.parse(row.metadataJson) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getPickupOperations(projectId: string) {
  await requireProjectAccess(projectId);
  const rows = await db
    .select()
    .from(pickupOperations)
    .where(eq(pickupOperations.projectId, projectId))
    .orderBy(asc(pickupOperations.pickupDate));

  return rows.map((row) => ({
    ...row,
    pickupDate: row.pickupDate.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getSettlement(projectId: string) {
  await requireProjectAccess(projectId);
  const [row] = await db.select().from(settlements).where(eq(settlements.projectId, projectId)).limit(1);
  return row
    ? {
        ...row,
        updatedAt: row.updatedAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
      }
    : null;
}
