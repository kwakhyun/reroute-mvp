PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_name_unique` ON `organizations` (`name`);--> statement-breakpoint
INSERT INTO `organizations` (`id`, `name`) VALUES ('org-reroute-demo', 'REROUTE 데모 조직');--> statement-breakpoint
CREATE TABLE `organization_memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'VIEWER' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `organization_memberships_org_user_unique` ON `organization_memberships` (`organization_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `organization_memberships_user_id_idx` ON `organization_memberships` (`user_id`);--> statement-breakpoint
INSERT INTO `organization_memberships` (`id`, `organization_id`, `user_id`, `role`)
SELECT 'membership-' || `id`, 'org-reroute-demo', `id`, `role` FROM `users`;--> statement-breakpoint
CREATE TABLE `__new_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
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
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "projects_asset_count_positive" CHECK("__new_projects"."asset_count" > 0),
	CONSTRAINT "projects_minimum_cash_nonnegative" CHECK("__new_projects"."minimum_cash_recovery" >= 0),
	CONSTRAINT "projects_minimum_reuse_rate_range" CHECK("__new_projects"."minimum_reuse_rate" >= 0 and "__new_projects"."minimum_reuse_rate" <= 100),
	CONSTRAINT "projects_maximum_pickup_rounds_range" CHECK("__new_projects"."maximum_pickup_rounds" >= 1 and "__new_projects"."maximum_pickup_rounds" <= 30)
);--> statement-breakpoint
INSERT INTO `__new_projects` (`id`, `organization_id`, `name`, `batch_label`, `location`, `status`, `asset_count`, `minimum_cash_recovery`, `minimum_reuse_rate`, `maximum_pickup_rounds`, `updated_at`, `created_at`)
SELECT `id`, 'org-reroute-demo', `name`, `batch_label`, `location`, `status`, `asset_count`, `minimum_cash_recovery`, `minimum_reuse_rate`, `maximum_pickup_rounds`, `updated_at`, `created_at` FROM `projects`;--> statement-breakpoint
DROP TABLE `projects`;--> statement-breakpoint
ALTER TABLE `__new_projects` RENAME TO `projects`;--> statement-breakpoint
CREATE INDEX `projects_organization_id_idx` ON `projects` (`organization_id`);--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`);--> statement-breakpoint
CREATE TABLE `__new_bids` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`asset_group_id` text NOT NULL,
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
	FOREIGN KEY (`asset_group_id`) REFERENCES `asset_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "bids_quantity_positive" CHECK("__new_bids"."quantity" > 0),
	CONSTRAINT "bids_cash_recovery_nonnegative" CHECK("__new_bids"."cash_recovery" >= 0),
	CONSTRAINT "bids_cost_savings_nonnegative" CHECK("__new_bids"."cost_savings" >= 0),
	CONSTRAINT "bids_reuse_quantity_range" CHECK("__new_bids"."reuse_quantity" >= 0 and "__new_bids"."reuse_quantity" <= "__new_bids"."quantity"),
	CONSTRAINT "bids_performance_rate_range" CHECK("__new_bids"."performance_rate" >= 0 and "__new_bids"."performance_rate" <= 100)
);--> statement-breakpoint
INSERT INTO `__new_bids` (`id`, `project_id`, `asset_group_id`, `partner_id`, `slot`, `quantity`, `cash_recovery`, `cost_savings`, `reuse_quantity`, `performance_label`, `performance_rate`, `pickup_date`, `submitted_at`, `created_at`)
SELECT b.`id`, b.`project_id`, ag.`id`, b.`partner_id`, b.`slot`, b.`quantity`, b.`cash_recovery`, b.`cost_savings`, b.`reuse_quantity`, b.`performance_label`, b.`performance_rate`, b.`pickup_date`, b.`submitted_at`, b.`created_at`
FROM `bids` b
JOIN `asset_groups` ag ON ag.`project_id` = b.`project_id`
	AND length(trim(b.`slot`)) = 1
	AND ag.`display_order` = unicode(upper(trim(b.`slot`))) - unicode('A') + 1;--> statement-breakpoint
CREATE TEMP TABLE `__migration_0002_guard` (`ok` integer NOT NULL CHECK (`ok` = 1));--> statement-breakpoint
INSERT INTO `__migration_0002_guard` (`ok`)
SELECT CASE WHEN (SELECT count(*) FROM `bids`) = (SELECT count(*) FROM `__new_bids`) THEN 1 ELSE 0 END;--> statement-breakpoint
DROP TABLE `__migration_0002_guard`;--> statement-breakpoint
DROP TABLE `bids`;--> statement-breakpoint
ALTER TABLE `__new_bids` RENAME TO `bids`;--> statement-breakpoint
CREATE INDEX `bids_project_id_idx` ON `bids` (`project_id`);--> statement-breakpoint
CREATE INDEX `bids_asset_group_id_idx` ON `bids` (`asset_group_id`);--> statement-breakpoint
CREATE INDEX `bids_partner_id_idx` ON `bids` (`partner_id`);--> statement-breakpoint
CREATE INDEX `bids_project_slot_idx` ON `bids` (`project_id`,`slot`);--> statement-breakpoint
CREATE TABLE `pickup_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`pickup_date` integer NOT NULL,
	`status` text DEFAULT 'PLANNED' NOT NULL,
	`address` text,
	`time_window` text,
	`vehicle_label` text,
	`operator_name` text,
	`updated_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `pickup_operations_project_date_unique` ON `pickup_operations` (`project_id`,`pickup_date`);--> statement-breakpoint
CREATE INDEX `pickup_operations_project_id_idx` ON `pickup_operations` (`project_id`);--> statement-breakpoint
CREATE TABLE `settlements` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`status` text DEFAULT 'NOT_CONNECTED' NOT NULL,
	`amount` integer NOT NULL,
	`provider_reference` text,
	`updated_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "settlements_amount_nonnegative" CHECK("settlements"."amount" >= 0)
);--> statement-breakpoint
CREATE UNIQUE INDEX `settlements_project_id_unique` ON `settlements` (`project_id`);--> statement-breakpoint
CREATE TEMP TABLE `__migration_0002_foreign_key_guard` (`ok` integer NOT NULL CHECK (`ok` = 1));--> statement-breakpoint
INSERT INTO `__migration_0002_foreign_key_guard` (`ok`)
SELECT CASE WHEN (SELECT count(*) FROM pragma_foreign_key_check) = 0 THEN 1 ELSE 0 END;--> statement-breakpoint
DROP TABLE `__migration_0002_foreign_key_guard`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
