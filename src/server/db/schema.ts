import { sql } from "drizzle-orm";
import { check, index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const userRoles = ["VIEWER", "MANAGER", "APPROVER"] as const;
export type UserRole = (typeof userRoles)[number];

export const projectStatuses = ["DRAFT", "MATCHING", "CONFIRMED"] as const;
export type ProjectStatus = (typeof projectStatuses)[number];

export const partnerTypes = ["BUSINESS", "EMPLOYEE", "NONPROFIT", "RECYCLER"] as const;
export type PartnerType = (typeof partnerTypes)[number];

export const planStatuses = ["DRAFT", "CONFIRMED"] as const;
export type PlanStatus = (typeof planStatuses)[number];

export const pickupStatuses = ["PLANNED", "READY", "IN_TRANSIT", "INSPECTED", "FAILED"] as const;
export type PickupStatus = (typeof pickupStatuses)[number];

export const settlementStatuses = ["NOT_CONNECTED", "PENDING", "FUNDED", "RELEASED", "FAILED"] as const;
export type SettlementStatus = (typeof settlementStatuses)[number];

const createdAt = integer("created_at", { mode: "timestamp_ms" })
  .notNull()
  .default(sql`(unixepoch() * 1000)`);

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: userRoles }).notNull().default("VIEWER"),
    team: text("team").notNull(),
    createdAt,
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const organizations = sqliteTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    createdAt,
  },
  (table) => [uniqueIndex("organizations_name_unique").on(table.name)],
);

export const organizationMemberships = sqliteTable(
  "organization_memberships",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: userRoles }).notNull().default("VIEWER"),
    createdAt,
  },
  (table) => [
    uniqueIndex("organization_memberships_org_user_unique").on(table.organizationId, table.userId),
    index("organization_memberships_user_id_idx").on(table.userId),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    tokenHash: text("token_hash").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt,
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const loginAttempts = sqliteTable(
  "login_attempts",
  {
    id: text("id").primaryKey(),
    identifierHash: text("identifier_hash").notNull(),
    successful: integer("successful", { mode: "boolean" }).notNull(),
    createdAt,
  },
  (table) => [index("login_attempts_identifier_created_idx").on(table.identifierHash, table.createdAt)],
);

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    batchLabel: text("batch_label").notNull(),
    location: text("location").notNull(),
    status: text("status", { enum: projectStatuses }).notNull().default("DRAFT"),
    assetCount: integer("asset_count").notNull(),
    minimumCashRecovery: integer("minimum_cash_recovery").notNull(),
    minimumReuseRate: real("minimum_reuse_rate").notNull(),
    maximumPickupRounds: integer("maximum_pickup_rounds").notNull(),
    version: integer("version").notNull().default(1),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    createdAt,
  },
  (table) => [
    index("projects_organization_id_idx").on(table.organizationId),
    index("projects_status_idx").on(table.status),
    check("projects_asset_count_positive", sql`${table.assetCount} > 0`),
    check("projects_minimum_cash_nonnegative", sql`${table.minimumCashRecovery} >= 0`),
    check("projects_minimum_reuse_rate_range", sql`${table.minimumReuseRate} >= 0 and ${table.minimumReuseRate} <= 100`),
    check("projects_maximum_pickup_rounds_range", sql`${table.maximumPickupRounds} >= 1 and ${table.maximumPickupRounds} <= 30`),
    check("projects_version_positive", sql`${table.version} > 0`),
  ],
);

export const assetGroups = sqliteTable(
  "asset_groups",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull(),
    displayOrder: integer("display_order").notNull(),
    quantity: integer("quantity").notNull(),
    conditionGrade: text("condition_grade").notNull(),
    conditionLabel: text("condition_label").notNull(),
    minimumRecovery: integer("minimum_recovery").notNull(),
    imagePath: text("image_path").notNull(),
    createdAt,
  },
  (table) => [
    index("asset_groups_project_id_idx").on(table.projectId),
    uniqueIndex("asset_groups_project_display_order_unique").on(table.projectId, table.displayOrder),
    check("asset_groups_quantity_positive", sql`${table.quantity} > 0`),
    check("asset_groups_minimum_recovery_nonnegative", sql`${table.minimumRecovery} >= 0`),
  ],
);

export const partners = sqliteTable(
  "partners",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type", { enum: partnerTypes }).notNull(),
    verificationLabel: text("verification_label").notNull(),
    verificationReference: text("verification_reference"),
    verifiedAt: integer("verified_at", { mode: "timestamp_ms" }),
    verifiedBy: text("verified_by"),
    verificationExpiresAt: integer("verification_expires_at", { mode: "timestamp_ms" }),
    isVerified: integer("is_verified", { mode: "boolean" }).notNull().default(false),
    createdAt,
  },
  (table) => [index("partners_type_idx").on(table.type)],
);

export const bids = sqliteTable(
  "bids",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    assetGroupId: text("asset_group_id")
      .notNull()
      .references(() => assetGroups.id, { onDelete: "cascade" }),
    partnerId: text("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "restrict" }),
    slot: text("slot").notNull(),
    quantity: integer("quantity").notNull(),
    cashRecovery: integer("cash_recovery").notNull().default(0),
    costSavings: integer("cost_savings").notNull().default(0),
    reuseQuantity: integer("reuse_quantity").notNull().default(0),
    performanceLabel: text("performance_label").notNull(),
    performanceRate: real("performance_rate").notNull(),
    pickupDate: integer("pickup_date", { mode: "timestamp_ms" }).notNull(),
    submittedAt: integer("submitted_at", { mode: "timestamp_ms" }).notNull(),
    createdAt,
  },
  (table) => [
    index("bids_project_id_idx").on(table.projectId),
    index("bids_asset_group_id_idx").on(table.assetGroupId),
    index("bids_partner_id_idx").on(table.partnerId),
    index("bids_project_slot_idx").on(table.projectId, table.slot),
    check("bids_quantity_positive", sql`${table.quantity} > 0`),
    check("bids_cash_recovery_nonnegative", sql`${table.cashRecovery} >= 0`),
    check("bids_cost_savings_nonnegative", sql`${table.costSavings} >= 0`),
    check("bids_reuse_quantity_range", sql`${table.reuseQuantity} >= 0 and ${table.reuseQuantity} <= ${table.quantity}`),
    check("bids_performance_rate_range", sql`${table.performanceRate} >= 0 and ${table.performanceRate} <= 100`),
  ],
);

export const pickupOperations = sqliteTable(
  "pickup_operations",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    pickupDate: integer("pickup_date", { mode: "timestamp_ms" }).notNull(),
    status: text("status", { enum: pickupStatuses }).notNull().default("PLANNED"),
    address: text("address"),
    timeWindow: text("time_window"),
    vehicleLabel: text("vehicle_label"),
    operatorName: text("operator_name"),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    createdAt,
  },
  (table) => [
    uniqueIndex("pickup_operations_project_date_unique").on(table.projectId, table.pickupDate),
    index("pickup_operations_project_id_idx").on(table.projectId),
  ],
);

export const settlements = sqliteTable(
  "settlements",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    status: text("status", { enum: settlementStatuses }).notNull().default("NOT_CONNECTED"),
    amount: integer("amount").notNull(),
    providerReference: text("provider_reference"),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    createdAt,
  },
  (table) => [
    uniqueIndex("settlements_project_id_unique").on(table.projectId),
    check("settlements_amount_nonnegative", sql`${table.amount} >= 0`),
  ],
);

export const matchPlans = sqliteTable(
  "match_plans",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    status: text("status", { enum: planStatuses }).notNull().default("DRAFT"),
    cashRecovery: integer("cash_recovery").notNull(),
    costSavings: integer("cost_savings").notNull(),
    netImpact: integer("net_impact").notNull(),
    reuseQuantity: integer("reuse_quantity").notNull(),
    reuseRate: real("reuse_rate").notNull(),
    pickupRounds: integer("pickup_rounds").notNull(),
    criteriaPassed: integer("criteria_passed", { mode: "boolean" }).notNull(),
    confirmedAt: integer("confirmed_at", { mode: "timestamp_ms" }),
    confirmedBy: text("confirmed_by").references(() => users.id, { onDelete: "set null" }),
    createdAt,
  },
  (table) => [
    index("match_plans_project_id_idx").on(table.projectId),
    index("match_plans_project_status_idx").on(table.projectId, table.status),
    uniqueIndex("match_plans_one_draft_per_project_unique")
      .on(table.projectId)
      .where(sql`${table.status} = 'DRAFT'`),
    uniqueIndex("match_plans_one_confirmed_per_project_unique")
      .on(table.projectId)
      .where(sql`${table.status} = 'CONFIRMED'`),
    check("match_plans_cash_recovery_nonnegative", sql`${table.cashRecovery} >= 0`),
    check("match_plans_cost_savings_nonnegative", sql`${table.costSavings} >= 0`),
    check("match_plans_net_impact_consistent", sql`${table.netImpact} = ${table.cashRecovery} + ${table.costSavings}`),
    check("match_plans_reuse_quantity_nonnegative", sql`${table.reuseQuantity} >= 0`),
    check("match_plans_reuse_rate_range", sql`${table.reuseRate} >= 0 and ${table.reuseRate} <= 100`),
    check("match_plans_pickup_rounds_positive", sql`${table.pickupRounds} > 0`),
  ],
);

export const matchAllocations = sqliteTable(
  "match_allocations",
  {
    id: text("id").primaryKey(),
    matchPlanId: text("match_plan_id")
      .notNull()
      .references(() => matchPlans.id, { onDelete: "cascade" }),
    bidId: text("bid_id")
      .notNull()
      .references(() => bids.id, { onDelete: "restrict" }),
    partnerId: text("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    cashRecovery: integer("cash_recovery").notNull(),
    costSavings: integer("cost_savings").notNull(),
    performanceLabel: text("performance_label").notNull(),
    performanceRate: real("performance_rate").notNull(),
    pickupDate: integer("pickup_date", { mode: "timestamp_ms" }).notNull(),
    createdAt,
  },
  (table) => [
    index("match_allocations_plan_id_idx").on(table.matchPlanId),
    uniqueIndex("match_allocations_plan_bid_unique").on(table.matchPlanId, table.bidId),
    check("match_allocations_quantity_positive", sql`${table.quantity} > 0`),
    check("match_allocations_cash_recovery_nonnegative", sql`${table.cashRecovery} >= 0`),
    check("match_allocations_cost_savings_nonnegative", sql`${table.costSavings} >= 0`),
    check("match_allocations_performance_rate_range", sql`${table.performanceRate} >= 0 and ${table.performanceRate} <= 100`),
  ],
);

export const mutationReceipts = sqliteTable(
  "mutation_receipts",
  {
    id: text("id").primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    resultJson: text("result_json").notNull(),
    createdAt,
  },
  (table) => [uniqueIndex("mutation_receipts_key_unique").on(table.idempotencyKey)],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    metadataJson: text("metadata_json").notNull().default("{}"),
    ipHash: text("ip_hash"),
    createdAt,
  },
  (table) => [
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ],
);

export const analyticsEvents = sqliteTable(
  "analytics_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    propertiesJson: text("properties_json").notNull().default("{}"),
    createdAt,
  },
  (table) => [
    index("analytics_events_name_idx").on(table.name),
    index("analytics_events_project_id_idx").on(table.projectId),
  ],
);

export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type OrganizationMembership = typeof organizationMemberships.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type AssetGroup = typeof assetGroups.$inferSelect;
export type Partner = typeof partners.$inferSelect;
export type Bid = typeof bids.$inferSelect;
export type MatchPlan = typeof matchPlans.$inferSelect;
export type PickupOperation = typeof pickupOperations.$inferSelect;
export type Settlement = typeof settlements.$inferSelect;
export type MatchAllocation = typeof matchAllocations.$inferSelect;
