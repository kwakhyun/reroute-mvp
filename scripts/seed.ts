import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { eq, inArray, sql } from "drizzle-orm";
import { DEMO_PROJECT_ID } from "../src/lib/constants";
import { hashPassword } from "../src/server/auth/password";
import { db } from "../src/server/db/connection";
import { DEMO_ACCOUNTS } from "../src/server/demo-data";
import {
  analyticsEvents,
  assetGroups,
  auditLogs,
  bids,
  loginAttempts,
  matchAllocations,
  matchPlans,
  mutationReceipts,
  organizationMemberships,
  organizations,
  partners,
  pickupOperations,
  projects,
  sessions,
  settlements,
  users,
  type PartnerType,
} from "../src/server/db/schema";
import { recommendMatchPlan, type CandidateBid } from "../src/server/services/matching-engine";

const at = (day: number, hour = 9) =>
  new Date(`2026-09-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00+09:00`);

const partnerSeed: Array<{
  id: string;
  name: string;
  type: PartnerType;
  verificationLabel: string;
}> = [
  { id: "partner-mapo-cowork", name: "마포 코워크", type: "BUSINESS", verificationLabel: "사업자 확인" },
  { id: "partner-employee-market", name: "임직원 사내마켓", type: "EMPLOYEE", verificationLabel: "사내 인증" },
  { id: "partner-saebom", name: "새봄지역아동센터", type: "NONPROFIT", verificationLabel: "비영리 확인" },
  { id: "partner-recycler", name: "인증 재활용 파트너", type: "RECYCLER", verificationLabel: "처리 허가 확인" },
  { id: "partner-reoffice", name: "리오피스 마켓", type: "BUSINESS", verificationLabel: "사업자 확인" },
  { id: "partner-clear", name: "오피스클리어", type: "BUSINESS", verificationLabel: "사업자 확인" },
  { id: "partner-circular-lab", name: "서큘러 랩", type: "RECYCLER", verificationLabel: "처리 허가 확인" },
];

const bidSeed: CandidateBid[] = [
  { id: "bid-a-mapo", assetGroupId: "asset-chairs", isPartnerVerified: true, partnerId: "partner-mapo-cowork", quantity: 96, cashRecovery: 720, costSavings: 0, reuseQuantity: 96, performanceLabel: "재사용", performanceRate: 90.3, pickupDate: at(8) },
  { id: "bid-a-reoffice", assetGroupId: "asset-chairs", isPartnerVerified: true, partnerId: "partner-reoffice", quantity: 96, cashRecovery: 680, costSavings: 0, reuseQuantity: 96, performanceLabel: "재사용", performanceRate: 88.9, pickupDate: at(9) },
  { id: "bid-a-circular", assetGroupId: "asset-chairs", isPartnerVerified: true, partnerId: "partner-circular-lab", quantity: 96, cashRecovery: 430, costSavings: 240, reuseQuantity: 0, performanceLabel: "소재 회수율", performanceRate: 91, pickupDate: at(11) },
  { id: "bid-b-employee", assetGroupId: "asset-monitor-arms", isPartnerVerified: true, partnerId: "partner-employee-market", quantity: 48, cashRecovery: 640, costSavings: 0, reuseQuantity: 48, performanceLabel: "재사용", performanceRate: 100, pickupDate: at(10) },
  { id: "bid-b-mapo", assetGroupId: "asset-monitor-arms", isPartnerVerified: true, partnerId: "partner-mapo-cowork", quantity: 48, cashRecovery: 600, costSavings: 0, reuseQuantity: 48, performanceLabel: "재사용", performanceRate: 100, pickupDate: at(11) },
  { id: "bid-b-clear", assetGroupId: "asset-monitor-arms", isPartnerVerified: true, partnerId: "partner-clear", quantity: 48, cashRecovery: 570, costSavings: 0, reuseQuantity: 48, performanceLabel: "재사용", performanceRate: 96.9, pickupDate: at(9) },
  { id: "bid-c-saebom", assetGroupId: "asset-drawers", isPartnerVerified: true, partnerId: "partner-saebom", quantity: 42, cashRecovery: 0, costSavings: 320, reuseQuantity: 42, performanceLabel: "재사용", performanceRate: 100, pickupDate: at(10) },
  { id: "bid-c-reoffice", assetGroupId: "asset-drawers", isPartnerVerified: true, partnerId: "partner-reoffice", quantity: 42, cashRecovery: 280, costSavings: 0, reuseQuantity: 42, performanceLabel: "재사용", performanceRate: 100, pickupDate: at(12) },
  { id: "bid-c-clear", assetGroupId: "asset-drawers", isPartnerVerified: true, partnerId: "partner-clear", quantity: 42, cashRecovery: 240, costSavings: 0, reuseQuantity: 42, performanceLabel: "재사용", performanceRate: 100, pickupDate: at(11) },
  { id: "bid-d-recycler", assetGroupId: "asset-tables", isPartnerVerified: true, partnerId: "partner-recycler", quantity: 28, cashRecovery: 200, costSavings: 300, reuseQuantity: 0, performanceLabel: "소재 회수율", performanceRate: 92, pickupDate: at(12) },
  { id: "bid-d-employee", assetGroupId: "asset-tables", isPartnerVerified: true, partnerId: "partner-employee-market", quantity: 28, cashRecovery: 230, costSavings: 0, reuseQuantity: 28, performanceLabel: "재사용", performanceRate: 100, pickupDate: at(13) },
];

type SeedOptions = { full?: boolean };
type SeedTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function clearDatabase(tx: SeedTransaction) {
  await tx.delete(settlements);
  await tx.delete(pickupOperations);
  await tx.delete(analyticsEvents);
  await tx.delete(auditLogs);
  await tx.delete(mutationReceipts);
  await tx.delete(matchAllocations);
  await tx.delete(matchPlans);
  await tx.delete(bids);
  await tx.delete(assetGroups);
  await tx.delete(partners);
  await tx.delete(loginAttempts);
  await tx.delete(sessions);
  await tx.delete(organizationMemberships);
  await tx.delete(projects);
  await tx.delete(users);
  await tx.delete(organizations);
}

async function clearDemoWorkspace(tx: SeedTransaction) {
  const demoUsers = ["user-approver", "user-manager", "user-viewer"];
  const demoProjects = await tx
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.organizationId, "org-reroute-demo"));
  const projectIds = demoProjects.map((project) => project.id);

  if (projectIds.length > 0) {
    const plans = await tx
      .select({ id: matchPlans.id })
      .from(matchPlans)
      .where(inArray(matchPlans.projectId, projectIds));
    const planIds = plans.map((plan) => plan.id);
    await tx.delete(settlements).where(inArray(settlements.projectId, projectIds));
    await tx.delete(pickupOperations).where(inArray(pickupOperations.projectId, projectIds));
    await tx.delete(analyticsEvents).where(inArray(analyticsEvents.projectId, projectIds));
    if (planIds.length > 0) {
      await tx.delete(matchAllocations).where(inArray(matchAllocations.matchPlanId, planIds));
    }
    await tx.delete(matchPlans).where(inArray(matchPlans.projectId, projectIds));
    await tx.delete(bids).where(inArray(bids.projectId, projectIds));
    await tx.delete(assetGroups).where(inArray(assetGroups.projectId, projectIds));
    await tx.delete(projects).where(inArray(projects.id, projectIds));
  }

  await tx.delete(mutationReceipts).where(inArray(mutationReceipts.userId, demoUsers));
  await tx.delete(auditLogs).where(inArray(auditLogs.actorUserId, demoUsers));
  await tx.delete(partners).where(inArray(partners.id, partnerSeed.map((partner) => partner.id)));
}

async function upsertDemoIdentity(tx: SeedTransaction, passwordHash: string) {
  const userRows = [
    { id: "user-approver", email: DEMO_ACCOUNTS.approver.email, name: "김지현", passwordHash, role: "APPROVER", team: "자산관리팀" },
    { id: "user-manager", email: DEMO_ACCOUNTS.manager.email, name: "박서준", passwordHash, role: "MANAGER", team: "자산운영팀" },
    { id: "user-viewer", email: DEMO_ACCOUNTS.viewer.email, name: "이하늘", passwordHash, role: "VIEWER", team: "경영기획팀" },
  ] as const;
  for (const user of userRows) {
    await tx
      .insert(users)
      .values(user)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: sql`excluded.email`,
          name: sql`excluded.name`,
          passwordHash: sql`excluded.password_hash`,
          role: sql`excluded.role`,
          team: sql`excluded.team`,
        },
      });
  }

  for (const organization of [
    { id: "org-reroute-demo", name: "REROUTE 샘플 조직" },
    { id: "org-foreign", name: "접근 격리 검증 조직" },
  ]) {
    await tx
      .insert(organizations)
      .values(organization)
      .onConflictDoUpdate({ target: organizations.id, set: { name: sql`excluded.name` } });
  }
  for (const membership of [
    { id: "membership-approver", organizationId: "org-reroute-demo", userId: "user-approver", role: "APPROVER" },
    { id: "membership-manager", organizationId: "org-reroute-demo", userId: "user-manager", role: "MANAGER" },
    { id: "membership-viewer", organizationId: "org-reroute-demo", userId: "user-viewer", role: "VIEWER" },
  ] as const) {
    await tx
      .insert(organizationMemberships)
      .values(membership)
      .onConflictDoUpdate({
        target: organizationMemberships.id,
        set: {
          organizationId: sql`excluded.organization_id`,
          userId: sql`excluded.user_id`,
          role: sql`excluded.role`,
        },
      });
  }
}

async function seedDemo(tx: SeedTransaction, passwordHash: string, options: SeedOptions) {
  if (options.full) {
    await clearDatabase(tx);
  } else {
    await clearDemoWorkspace(tx);
  }
  await upsertDemoIdentity(tx, passwordHash);

  await tx.insert(projects).values({
    id: DEMO_PROJECT_ID,
    organizationId: "org-reroute-demo",
    name: "성수 오피스 이전",
    batchLabel: "회의실·라운지 자산 214개",
    location: "서울 성동구 성수동",
    status: "MATCHING",
    assetCount: 214,
    minimumCashRecovery: 1740,
    minimumReuseRate: 80,
    maximumPickupRounds: 3,
    updatedAt: new Date("2026-09-01T10:30:00+09:00"),
  });
  await tx
    .insert(projects)
    .values({
      id: "project-foreign-audit",
      organizationId: "org-foreign",
      name: "격리된 인수 프로젝트",
      batchLabel: "비공개 자산 1개",
      location: "비공개",
      status: "DRAFT",
      assetCount: 1,
      minimumCashRecovery: 0,
      minimumReuseRate: 0,
      maximumPickupRounds: 1,
      updatedAt: new Date("2026-09-01T09:00:00+09:00"),
    })
    .onConflictDoNothing();

  await tx.insert(assetGroups).values([
    { id: "asset-chairs", projectId: DEMO_PROJECT_ID, name: "회의용 의자", category: "CHAIR", displayOrder: 1, quantity: 96, conditionGrade: "B", conditionLabel: "양호", minimumRecovery: 600, imagePath: "/assets/meeting-chair.png" },
    { id: "asset-monitor-arms", projectId: DEMO_PROJECT_ID, name: "모니터 암", category: "MONITOR_ARM", displayOrder: 2, quantity: 48, conditionGrade: "B+", conditionLabel: "양호", minimumRecovery: 480, imagePath: "/assets/monitor-arm.png" },
    { id: "asset-drawers", projectId: DEMO_PROJECT_ID, name: "이동 서랍", category: "PEDESTAL", displayOrder: 3, quantity: 42, conditionGrade: "B", conditionLabel: "양호", minimumRecovery: 420, imagePath: "/assets/mobile-pedestal.png" },
    { id: "asset-tables", projectId: DEMO_PROJECT_ID, name: "라운지 테이블", category: "TABLE", displayOrder: 4, quantity: 28, conditionGrade: "C+", conditionLabel: "보통", minimumRecovery: 240, imagePath: "/assets/lounge-table.png" },
  ]);

  await tx.insert(partners).values(partnerSeed.map((partner, index) => ({
    ...partner,
    isVerified: true,
    verificationReference: `SAMPLE-EVIDENCE-${String(index + 1).padStart(3, "0")}`,
    verifiedAt: at(1),
    verifiedBy: "user-approver",
    verificationExpiresAt: new Date("2027-09-01T12:00:00+09:00"),
  })));
  await tx.insert(bids).values(
    bidSeed.map((bid, index) => ({
      ...bid,
      slot: ["asset-chairs", "asset-monitor-arms", "asset-drawers", "asset-tables"].indexOf(bid.assetGroupId) >= 0
        ? String.fromCharCode(65 + ["asset-chairs", "asset-monitor-arms", "asset-drawers", "asset-tables"].indexOf(bid.assetGroupId))
        : bid.assetGroupId,
      projectId: DEMO_PROJECT_ID,
      submittedAt: new Date(at(1).getTime() - index * 45 * 60 * 1000),
    })),
  );

  const recommendation = recommendMatchPlan(
    bidSeed,
    {
      assetCount: 214,
      minimumCashRecovery: 1740,
      minimumReuseRate: 80,
      maximumPickupRounds: 3,
    },
    [
      { id: "asset-chairs", quantity: 96, minimumRecovery: 600 },
      { id: "asset-monitor-arms", quantity: 48, minimumRecovery: 480 },
      { id: "asset-drawers", quantity: 42, minimumRecovery: 420 },
      { id: "asset-tables", quantity: 28, minimumRecovery: 240 },
    ],
  );
  const planId = "plan-initial-recommendation";

  await tx.insert(matchPlans).values({
    id: planId,
    projectId: DEMO_PROJECT_ID,
    status: "DRAFT",
    cashRecovery: recommendation.cashRecovery,
    costSavings: recommendation.costSavings,
    netImpact: recommendation.netImpact,
    reuseQuantity: recommendation.reuseQuantity,
    reuseRate: recommendation.reuseRate,
    pickupRounds: recommendation.pickupRounds,
    criteriaPassed: recommendation.criteriaPassed,
  });

  await tx.insert(matchAllocations).values(
    recommendation.bids.map((bid) => ({
      id: randomUUID(),
      matchPlanId: planId,
      bidId: bid.id,
      partnerId: bid.partnerId,
      quantity: bid.quantity,
      cashRecovery: bid.cashRecovery,
      costSavings: bid.costSavings,
      performanceLabel: bid.performanceLabel,
      performanceRate: bid.performanceRate,
      pickupDate: bid.pickupDate,
    })),
  );

  await tx.insert(auditLogs).values({
    id: randomUUID(),
    actorUserId: "user-approver",
    action: "PROJECT_SEEDED",
    entityType: "PROJECT",
    entityId: DEMO_PROJECT_ID,
    metadataJson: JSON.stringify({ planId, bidCount: bidSeed.length }),
  });

  const [project] = await tx.select().from(projects).where(eq(projects.id, DEMO_PROJECT_ID));
  if (!project) {
    throw new Error("샘플 프로젝트 시드를 확인할 수 없습니다.");
  }
  return project;
}

const globalForDemoReset = globalThis as unknown as {
  rerouteDemoReset?: Promise<void>;
};

export async function resetDemoDatabase(options: SeedOptions = {}) {
  if (globalForDemoReset.rerouteDemoReset) {
    return globalForDemoReset.rerouteDemoReset;
  }

  const reset = (async () => {
    const passwordHash = await hashPassword(DEMO_ACCOUNTS.approver.password);
    const project = await db.transaction((tx) => seedDemo(tx, passwordHash, options));
    console.info(`Seeded ${project.name} with ${bidSeed.length} bids.`);
  })();
  globalForDemoReset.rerouteDemoReset = reset;
  try {
    await reset;
  } finally {
    delete globalForDemoReset.rerouteDemoReset;
  }
}

const isDirectRun = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  resetDemoDatabase({ full: true }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
