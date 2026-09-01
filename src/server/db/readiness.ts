import "server-only";

import type { Client } from "@libsql/client";
import { databaseClient } from "./client";

export const REQUIRED_MIGRATION_COUNT = 4;
const REQUIRED_TABLES = ["users", "projects", "asset_groups", "bids", "match_plans"] as const;
const REQUIRED_INVARIANT_TRIGGERS = [
  "bids_same_project_insert",
  "bids_same_project_update",
  "allocations_consistent_insert",
  "allocations_consistent_update",
] as const;

export async function checkDatabaseReadiness(client: Client = databaseClient) {
  const tablePlaceholders = REQUIRED_TABLES.map(() => "?").join(",");
  const triggerPlaceholders = REQUIRED_INVARIANT_TRIGGERS.map(() => "?").join(",");
  const [migrations, tables, triggers] = await client.batch([
    { sql: "SELECT count(*) AS count FROM __drizzle_migrations", args: [] },
    {
      sql: `SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name IN (${tablePlaceholders})`,
      args: [...REQUIRED_TABLES],
    },
    {
      sql: `SELECT count(*) AS count FROM sqlite_master WHERE type = 'trigger' AND name IN (${triggerPlaceholders})`,
      args: [...REQUIRED_INVARIANT_TRIGGERS],
    },
  ]);
  const migrationCount = Number(migrations.rows[0]?.count ?? 0);
  const tableCount = Number(tables.rows[0]?.count ?? 0);
  const triggerCount = Number(triggers.rows[0]?.count ?? 0);
  if (
    migrationCount < REQUIRED_MIGRATION_COUNT ||
    tableCount !== REQUIRED_TABLES.length ||
    triggerCount !== REQUIRED_INVARIANT_TRIGGERS.length
  ) {
    throw new Error(
      `Database schema is not ready: migrations=${migrationCount}, tables=${tableCount}, triggers=${triggerCount}`,
    );
  }
  return { migrationCount, tableCount, triggerCount };
}
