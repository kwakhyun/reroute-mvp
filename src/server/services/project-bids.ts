import "server-only";
import { and, asc, count, desc, eq, exists, type SQL } from "drizzle-orm";
import { db } from "@/server/db/client";
import { requireProjectAccess } from "@/server/auth/project-access";
import { assetGroups, bids, matchAllocations, matchPlans, partners } from "@/server/db/schema";
import { isPartnerEvidenceCurrent } from "./matching-policies";

export const BID_PAGE_SIZE = 50;
export type BidFilters = { page?: number; assetGroupId?: string; selectedOnly?: boolean };

function selectedBid(projectId: string) {
  const plan = db.select({ id: matchPlans.id }).from(matchPlans).where(eq(matchPlans.projectId, projectId))
    .orderBy(desc(matchPlans.confirmedAt), desc(matchPlans.createdAt)).limit(1);
  return exists(db.select({ id: matchAllocations.id }).from(matchAllocations)
    .where(and(eq(matchAllocations.matchPlanId, plan), eq(matchAllocations.bidId, bids.id))));
}

function bidQuery(projectId: string, filter: SQL | undefined) {
  return db
    .select({
      isSelected: selectedBid(projectId),
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
    .where(filter).orderBy(desc(bids.cashRecovery), desc(bids.costSavings), asc(bids.id)).$dynamic();

}

function serializeBids(rows: Awaited<ReturnType<typeof bidQuery>>) {
  return rows.map((row) => ({
    ...row,
    isSelected: Boolean(row.isSelected),
    isVerified: isPartnerEvidenceCurrent(row),
    pickupDate: row.pickupDate.toISOString(),
    submittedAt: row.submittedAt.toISOString(),
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    verificationExpiresAt: row.verificationExpiresAt?.toISOString() ?? null,
  }));
}

// Exports intentionally include every bid, independent of the UI's current filters.
export async function getProjectBids(projectId: string) {
  await requireProjectAccess(projectId);
  return serializeBids(await bidQuery(projectId, eq(bids.projectId, projectId)));
}

export async function getProjectBidPage(projectId: string, filters: BidFilters = {}) {
  const { project, membership } = await requireProjectAccess(projectId);
  const filter = and(eq(bids.projectId, projectId),
    filters.assetGroupId ? eq(bids.assetGroupId, filters.assetGroupId) : undefined,
    filters.selectedOnly ? selectedBid(projectId) : undefined);
  const [[totalRow], assets] = await db.batch([
    db.select({ count: count() }).from(bids).where(filter),
    db.select({ id: assetGroups.id, name: assetGroups.name }).from(assetGroups)
      .where(eq(assetGroups.projectId, projectId)).orderBy(asc(assetGroups.displayOrder)),
  ]);
  const total = totalRow.count;
  const pageCount = Math.max(1, Math.ceil(total / BID_PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, Number.isSafeInteger(filters.page) ? filters.page! : 1));
  const rows = await bidQuery(projectId, filter).limit(BID_PAGE_SIZE).offset((page - 1) * BID_PAGE_SIZE);
  return { project, membershipRole: membership.role, rows: serializeBids(rows), total, page, pageCount, assets };
}
