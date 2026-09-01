import "server-only";

import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
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
    .select({ project: projects, membershipRole: organizationMemberships.role })
    .from(projects)
    .innerJoin(
      organizationMemberships,
      and(
        eq(organizationMemberships.organizationId, projects.organizationId),
        eq(organizationMemberships.userId, user.id),
      ),
    )
    .orderBy(desc(projects.updatedAt));
  const projectIds = projectRows.map(({ project }) => project.id);
  const planRows = projectIds.length
    ? await db
        .select()
        .from(matchPlans)
        .where(inArray(matchPlans.projectId, projectIds))
        .orderBy(desc(matchPlans.createdAt))
    : [];
  const latestPlanByProject = new Map<string, (typeof planRows)[number]>();
  for (const plan of planRows) {
    if (!latestPlanByProject.has(plan.projectId)) {
      latestPlanByProject.set(plan.projectId, plan);
    }
  }

  return projectRows.map(({ project, membershipRole }) => {
    const plan = latestPlanByProject.get(project.id);
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

export async function getMatchingDashboard(projectId: string) {
  const { project, membership } = await requireProjectAccess(projectId);
  const [assets, bidCountResult, plans] = await Promise.all([
    db.select().from(assetGroups).where(eq(assetGroups.projectId, projectId)).orderBy(asc(assetGroups.displayOrder)),
    db.select({ count: count() }).from(bids).where(eq(bids.projectId, projectId)),
    db
      .select()
      .from(matchPlans)
      .where(eq(matchPlans.projectId, projectId))
      .orderBy(desc(matchPlans.confirmedAt), desc(matchPlans.createdAt))
      .limit(1),
  ]);

  const plan = plans[0] ?? null;
  const allocations = plan
    ? await db
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
        .where(eq(matchAllocations.matchPlanId, plan.id))
        .orderBy(asc(assetGroups.displayOrder), asc(partners.name))
    : [];

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

export async function getProjectBids(projectId: string) {
  await requireProjectAccess(projectId);
  const rows = await db
    .select({
      id: bids.id,
      slot: bids.slot,
      assetGroupId: bids.assetGroupId,
      assetGroupName: assetGroups.name,
      quantity: bids.quantity,
      cashRecovery: bids.cashRecovery,
      costSavings: bids.costSavings,
      reuseQuantity: bids.reuseQuantity,
      performanceLabel: bids.performanceLabel,
      performanceRate: bids.performanceRate,
      pickupDate: bids.pickupDate,
      submittedAt: bids.submittedAt,
      partnerName: partners.name,
      partnerType: partners.type,
      verificationLabel: partners.verificationLabel,
      verificationReference: partners.verificationReference,
      verifiedAt: partners.verifiedAt,
      verificationExpiresAt: partners.verificationExpiresAt,
      isVerified: partners.isVerified,
    })
    .from(bids)
    .innerJoin(assetGroups, eq(bids.assetGroupId, assetGroups.id))
    .innerJoin(partners, eq(bids.partnerId, partners.id))
    .where(eq(bids.projectId, projectId))
    .orderBy(desc(bids.cashRecovery), desc(bids.costSavings));

  return rows.map((row) => ({
    ...row,
    isVerified: isPartnerEvidenceCurrent(row),
    pickupDate: row.pickupDate.toISOString(),
    submittedAt: row.submittedAt.toISOString(),
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    verificationExpiresAt: row.verificationExpiresAt?.toISOString() ?? null,
  }));
}

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
