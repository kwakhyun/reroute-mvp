CREATE TABLE `analytics_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`project_id` text,
	`name` text NOT NULL,
	`properties_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `analytics_events_name_idx` ON `analytics_events` (`name`);--> statement-breakpoint
CREATE INDEX `analytics_events_project_id_idx` ON `analytics_events` (`project_id`);--> statement-breakpoint
CREATE TABLE `asset_groups` (
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
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `asset_groups_project_id_idx` ON `asset_groups` (`project_id`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`ip_hash` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `bids` (
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
	FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `bids_project_id_idx` ON `bids` (`project_id`);--> statement-breakpoint
CREATE INDEX `bids_partner_id_idx` ON `bids` (`partner_id`);--> statement-breakpoint
CREATE INDEX `bids_project_slot_idx` ON `bids` (`project_id`,`slot`);--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier_hash` text NOT NULL,
	`successful` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `login_attempts_identifier_created_idx` ON `login_attempts` (`identifier_hash`,`created_at`);--> statement-breakpoint
CREATE TABLE `match_allocations` (
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
	FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `match_allocations_plan_id_idx` ON `match_allocations` (`match_plan_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `match_allocations_plan_bid_unique` ON `match_allocations` (`match_plan_id`,`bid_id`);--> statement-breakpoint
CREATE TABLE `match_plans` (
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
	FOREIGN KEY (`confirmed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `match_plans_project_id_idx` ON `match_plans` (`project_id`);--> statement-breakpoint
CREATE INDEX `match_plans_project_status_idx` ON `match_plans` (`project_id`,`status`);--> statement-breakpoint
CREATE TABLE `mutation_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`idempotency_key` text NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`result_json` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mutation_receipts_key_unique` ON `mutation_receipts` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `partners` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`verification_label` text NOT NULL,
	`is_verified` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `partners_type_idx` ON `partners` (`type`);--> statement-breakpoint
CREATE TABLE `projects` (
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
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'VIEWER' NOT NULL,
	`team` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);