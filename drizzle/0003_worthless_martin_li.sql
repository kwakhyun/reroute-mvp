ALTER TABLE `partners` ADD `verification_reference` text;--> statement-breakpoint
ALTER TABLE `partners` ADD `verified_at` integer;--> statement-breakpoint
ALTER TABLE `partners` ADD `verified_by` text;--> statement-breakpoint
ALTER TABLE `partners` ADD `verification_expires_at` integer;--> statement-breakpoint
UPDATE `partners`
SET `verification_reference` = 'legacy:' || `id`,
    `verified_at` = `created_at`
WHERE `is_verified` = 1;--> statement-breakpoint
ALTER TABLE `projects` ADD `version` integer DEFAULT 1 NOT NULL CHECK (`version` > 0);--> statement-breakpoint
UPDATE `projects`
SET `minimum_cash_recovery` = MAX(
  `minimum_cash_recovery`,
  COALESCE((
    SELECT SUM(`asset_groups`.`minimum_recovery`)
    FROM `asset_groups`
    WHERE `asset_groups`.`project_id` = `projects`.`id`
  ), 0)
);--> statement-breakpoint
CREATE TEMP TABLE `__invariant_guard` (
  `violation_count` integer NOT NULL CHECK (`violation_count` = 0)
);--> statement-breakpoint
INSERT INTO `__invariant_guard` (`violation_count`)
SELECT COUNT(*)
FROM `bids`
INNER JOIN `asset_groups` ON `asset_groups`.`id` = `bids`.`asset_group_id`
WHERE `asset_groups`.`project_id` <> `bids`.`project_id`;--> statement-breakpoint
INSERT INTO `__invariant_guard` (`violation_count`)
SELECT COUNT(*)
FROM `match_allocations`
INNER JOIN `bids` ON `bids`.`id` = `match_allocations`.`bid_id`
INNER JOIN `match_plans` ON `match_plans`.`id` = `match_allocations`.`match_plan_id`
WHERE `bids`.`partner_id` <> `match_allocations`.`partner_id`
   OR `bids`.`project_id` <> `match_plans`.`project_id`;--> statement-breakpoint
DROP TABLE `__invariant_guard`;--> statement-breakpoint
CREATE TRIGGER `bids_same_project_insert`
BEFORE INSERT ON `bids`
WHEN (SELECT `project_id` FROM `asset_groups` WHERE `id` = NEW.`asset_group_id`) IS NOT NEW.`project_id`
BEGIN
  SELECT RAISE(ABORT, 'bid_asset_project_mismatch');
END;--> statement-breakpoint
CREATE TRIGGER `bids_same_project_update`
BEFORE UPDATE OF `project_id`, `asset_group_id` ON `bids`
WHEN (SELECT `project_id` FROM `asset_groups` WHERE `id` = NEW.`asset_group_id`) IS NOT NEW.`project_id`
BEGIN
  SELECT RAISE(ABORT, 'bid_asset_project_mismatch');
END;--> statement-breakpoint
CREATE TRIGGER `allocations_consistent_insert`
BEFORE INSERT ON `match_allocations`
WHEN (SELECT `partner_id` FROM `bids` WHERE `id` = NEW.`bid_id`) IS NOT NEW.`partner_id`
  OR (SELECT `project_id` FROM `bids` WHERE `id` = NEW.`bid_id`)
     IS NOT (SELECT `project_id` FROM `match_plans` WHERE `id` = NEW.`match_plan_id`)
BEGIN
  SELECT RAISE(ABORT, 'allocation_bid_mismatch');
END;--> statement-breakpoint
CREATE TRIGGER `allocations_consistent_update`
BEFORE UPDATE OF `match_plan_id`, `bid_id`, `partner_id` ON `match_allocations`
WHEN (SELECT `partner_id` FROM `bids` WHERE `id` = NEW.`bid_id`) IS NOT NEW.`partner_id`
  OR (SELECT `project_id` FROM `bids` WHERE `id` = NEW.`bid_id`)
     IS NOT (SELECT `project_id` FROM `match_plans` WHERE `id` = NEW.`match_plan_id`)
BEGIN
  SELECT RAISE(ABORT, 'allocation_bid_mismatch');
END;--> statement-breakpoint
CREATE TEMP TABLE `__foreign_key_guard` (
  `violation_count` integer NOT NULL CHECK (`violation_count` = 0)
);--> statement-breakpoint
INSERT INTO `__foreign_key_guard` (`violation_count`)
SELECT COUNT(*) FROM pragma_foreign_key_check;--> statement-breakpoint
DROP TABLE `__foreign_key_guard`;
