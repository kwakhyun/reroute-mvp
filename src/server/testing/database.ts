import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { createDatabase } from "@/server/db/create-database";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "@/server/db/schema";

// Every test gets its own local database; application environment variables are never used.
export async function createTestDatabase(groupCount = 2) {
  const directory = await mkdtemp(path.join(tmpdir(), "reroute-service-test-"));
  const url = `file:${path.join(directory, "test.db")}`;
  const client = createClient({ url });
  const db = createDatabase(client, url);
  await migrate(db, { migrationsFolder: path.resolve("drizzle") });
  await db.insert(schema.users).values(["approver-a", "approver-b"].map((id) => ({ id, email: `${id}@example.test`, name: id, passwordHash: "test-only", role: "APPROVER" as const, team: "Test" })));
  await db.insert(schema.organizationMemberships).values(["approver-a", "approver-b"].map((id) => ({ id, userId: id, organizationId: "org-reroute-demo", role: "APPROVER" as const })));
  await db.insert(schema.projects).values({ id: "project-test", organizationId: "org-reroute-demo", name: "검증 프로젝트", batchLabel: "샘플", location: "서울", assetCount: groupCount, minimumCashRecovery: groupCount * 10, minimumReuseRate: 0, maximumPickupRounds: 3, updatedAt: new Date() });
  const assets = Array.from({ length: groupCount }, (_, index) => ({ id: `asset-${index}`, projectId: "project-test", name: `의자 ${index}`, category: "CHAIR", displayOrder: index, quantity: 1, conditionGrade: "A", conditionLabel: "양호", minimumRecovery: 10, imagePath: "/assets/meeting-chair.png" }));
  await db.insert(schema.assetGroups).values(assets);
  await db.insert(schema.partners).values({ id: "partner-test", name: "인수처", type: "BUSINESS", verificationLabel: "서류 확인", verificationReference: "reference-test", verifiedAt: new Date(), isVerified: true });
  await db.insert(schema.bids).values(assets.map((asset) => ({ id: `bid-${asset.id}`, projectId: "project-test", assetGroupId: asset.id, partnerId: "partner-test", slot: `G${asset.displayOrder}`, quantity: 1, cashRecovery: 10, costSavings: 0, reuseQuantity: 1, performanceLabel: "재사용", performanceRate: 100, pickupDate: new Date("2030-09-15T00:00:00+09:00"), submittedAt: new Date() })));
  return { client, db, url, assets, close: async () => { client.close(); await rm(directory, { recursive: true, force: true }); } };
}
