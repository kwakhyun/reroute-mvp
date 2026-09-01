PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_asset_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`display_order` integer NOT NULL,
	`quantity` integer NOT NULL,
	`condition_grade` text NOT NULL,
	`condition_label` text NOT NULL,
	`minimum_recovery` integer NOT NULL,
	`image_path` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "asset_groups_quantity_positive" CHECK("__new_asset_groups"."quantity" > 0),
	CONSTRAINT "asset_groups_minimum_recovery_nonnegative" CHECK("__new_asset_groups"."minimum_recovery" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_asset_groups`("id", "project_id", "name", "category", "display_order", "quantity", "condition_grade", "condition_label", "minimum_recovery", "image_path", "created_at") SELECT "id", "project_id", "name", "category", "display_order", "quantity", "condition_grade", "condition_label", "minimum_recovery", "image_path", "created_at" FROM `asset_groups`;--> statement-breakpoint
DROP TABLE `asset_groups`;--> statement-breakpoint
ALTER TABLE `__new_asset_groups` RENAME TO `asset_groups`;--> statement-breakpoint
CREATE INDEX `asset_groups_project_id_idx` ON `asset_groups` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `asset_groups_project_display_order_unique` ON `asset_groups` (`project_id`,`display_order`);--> statement-breakpoint
CREATE TABLE `__new_match_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`cash_recovery` integer NOT NULL,
	`cost_savings` integer NOT NULL,
	`net_impact` integer NOT NULL,
	`reuse_quantity` integer NOT NULL,
	`reuse_rate` real NOT NULL,
	`pickup_rounds` integer NOT NULL,
	`criteria_passed` integer NOT NULL,
	`confirmed_at` integer,
	`confirmed_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`confirmed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "match_plans_cash_recovery_nonnegative" CHECK("__new_match_plans"."cash_recovery" >= 0),
	CONSTRAINT "match_plans_cost_savings_nonnegative" CHECK("__new_match_plans"."cost_savings" >= 0),
	CONSTRAINT "match_plans_net_impact_consistent" CHECK("__new_match_plans"."net_impact" = "__new_match_plans"."cash_recovery" + "__new_match_plans"."cost_savings"),
	CONSTRAINT "match_plans_reuse_quantity_nonnegative" CHECK("__new_match_plans"."reuse_quantity" >= 0),
	CONSTRAINT "match_plans_reuse_rate_range" CHECK("__new_match_plans"."reuse_rate" >= 0 and "__new_match_plans"."reuse_rate" <= 100),
	CONSTRAINT "match_plans_pickup_rounds_positive" CHECK("__new_match_plans"."pickup_rounds" > 0)
);
--> statement-breakpoint
INSERT INTO `__new_match_plans`("id", "project_id", "status", "cash_recovery", "cost_savings", "net_impact", "reuse_quantity", "reuse_rate", "pickup_rounds", "criteria_passed", "confirmed_at", "confirmed_by", "created_at") SELECT "id", "project_id", "status", "cash_recovery", "cost_savings", "net_impact", "reuse_quantity", "reuse_rate", "pickup_rounds", "criteria_passed", "confirmed_at", "confirmed_by", "created_at" FROM `match_plans`;--> statement-breakpoint
DROP TABLE `match_plans`;--> statement-breakpoint
ALTER TABLE `__new_match_plans` RENAME TO `match_plans`;--> statement-breakpoint
CREATE INDEX `match_plans_project_id_idx` ON `match_plans` (`project_id`);--> statement-breakpoint
CREATE INDEX `match_plans_project_status_idx` ON `match_plans` (`project_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `match_plans_one_draft_per_project_unique` ON `match_plans` (`project_id`) WHERE "match_plans"."status" = 'DRAFT';--> statement-breakpoint
CREATE UNIQUE INDEX `match_plans_one_confirmed_per_project_unique` ON `match_plans` (`project_id`) WHERE "match_plans"."status" = 'CONFIRMED';--> statement-breakpoint
CREATE TABLE `__new_bids` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`partner_id` text NOT NULL,
	`slot` text NOT NULL,
	`quantity` integer NOT NULL,
	`cash_recovery` integer DEFAULT 0 NOT NULL,
	`cost_savings` integer DEFAULT 0 NOT NULL,
	`reuse_quantity` integer DEFAULT 0 NOT NULL,
	`performance_label` text NOT NULL,
	`performance_rate` real NOT NULL,
	`pickup_date` integer NOT NULL,
	`submitted_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "bids_quantity_positive" CHECK("__new_bids"."quantity" > 0),
	CONSTRAINT "bids_cash_recovery_nonnegative" CHECK("__new_bids"."cash_recovery" >= 0),
	CONSTRAINT "bids_cost_savings_nonnegative" CHECK("__new_bids"."cost_savings" >= 0),
	CONSTRAINT "bids_reuse_quantity_range" CHECK("__new_bids"."reuse_quantity" >= 0 and "__new_bids"."reuse_quantity" <= "__new_bids"."quantity"),
	CONSTRAINT "bids_performance_rate_range" CHECK("__new_bids"."performance_rate" >= 0 and "__new_bids"."performance_rate" <= 100)
);
--> statement-breakpoint
INSERT INTO `__new_bids`("id", "project_id", "partner_id", "slot", "quantity", "cash_recovery", "cost_savings", "reuse_quantity", "performance_label", "performance_rate", "pickup_date", "submitted_at", "created_at") SELECT "id", "project_id", "partner_id", "slot", "quantity", "cash_recovery", "cost_savings", "reuse_quantity", "performance_label", "performance_rate", "pickup_date", "submitted_at", "created_at" FROM `bids`;--> statement-breakpoint
DROP TABLE `bids`;--> statement-breakpoint
ALTER TABLE `__new_bids` RENAME TO `bids`;--> statement-breakpoint
CREATE INDEX `bids_project_id_idx` ON `bids` (`project_id`);--> statement-breakpoint
CREATE INDEX `bids_partner_id_idx` ON `bids` (`partner_id`);--> statement-breakpoint
CREATE INDEX `bids_project_slot_idx` ON `bids` (`project_id`,`slot`);--> statement-breakpoint
CREATE TABLE `__new_match_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`match_plan_id` text NOT NULL,
	`bid_id` text NOT NULL,
	`partner_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`cash_recovery` integer NOT NULL,
	`cost_savings` integer NOT NULL,
	`performance_label` text NOT NULL,
	`performance_rate` real NOT NULL,
	`pickup_date` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`match_plan_id`) REFERENCES `match_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bid_id`) REFERENCES `bids`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "match_allocations_quantity_positive" CHECK("__new_match_allocations"."quantity" > 0),
	CONSTRAINT "match_allocations_cash_recovery_nonnegative" CHECK("__new_match_allocations"."cash_recovery" >= 0),
	CONSTRAINT "match_allocations_cost_savings_nonnegative" CHECK("__new_match_allocations"."cost_savings" >= 0),
	CONSTRAINT "match_allocations_performance_rate_range" CHECK("__new_match_allocations"."performance_rate" >= 0 and "__new_match_allocations"."performance_rate" <= 100)
);
--> statement-breakpoint
INSERT INTO `__new_match_allocations`("id", "match_plan_id", "bid_id", "partner_id", "quantity", "cash_recovery", "cost_savings", "performance_label", "performance_rate", "pickup_date", "created_at") SELECT "id", "match_plan_id", "bid_id", "partner_id", "quantity", "cash_recovery", "cost_savings", "performance_label", "performance_rate", "pickup_date", "created_at" FROM `match_allocations`;--> statement-breakpoint
DROP TABLE `match_allocations`;--> statement-breakpoint
ALTER TABLE `__new_match_allocations` RENAME TO `match_allocations`;--> statement-breakpoint
CREATE INDEX `match_allocations_plan_id_idx` ON `match_allocations` (`match_plan_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `match_allocations_plan_bid_unique` ON `match_allocations` (`match_plan_id`,`bid_id`);--> statement-breakpoint
CREATE TABLE `__new_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`batch_label` text NOT NULL,
	`location` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`asset_count` integer NOT NULL,
	`minimum_cash_recovery` integer NOT NULL,
	`minimum_reuse_rate` real NOT NULL,
	`maximum_pickup_rounds` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "projects_asset_count_positive" CHECK("__new_projects"."asset_count" > 0),
	CONSTRAINT "projects_minimum_cash_nonnegative" CHECK("__new_projects"."minimum_cash_recovery" >= 0),
	CONSTRAINT "projects_minimum_reuse_rate_range" CHECK("__new_projects"."minimum_reuse_rate" >= 0 and "__new_projects"."minimum_reuse_rate" <= 100),
	CONSTRAINT "projects_maximum_pickup_rounds_range" CHECK("__new_projects"."maximum_pickup_rounds" >= 1 and "__new_projects"."maximum_pickup_rounds" <= 30)
);
--> statement-breakpoint
INSERT INTO `__new_projects`("id", "name", "batch_label", "location", "status", "asset_count", "minimum_cash_recovery", "minimum_reuse_rate", "maximum_pickup_rounds", "updated_at", "created_at") SELECT "id", "name", "batch_label", "location", "status", "asset_count", "minimum_cash_recovery", "minimum_reuse_rate", "maximum_pickup_rounds", "updated_at", "created_at" FROM `projects`;--> statement-breakpoint
DROP TABLE `projects`;--> statement-breakpoint
ALTER TABLE `__new_projects` RENAME TO `projects`;--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`);--> statement-breakpoint
PRAGMA foreign_key_check;--> statement-breakpoint
PRAGMA foreign_keys=ON;
