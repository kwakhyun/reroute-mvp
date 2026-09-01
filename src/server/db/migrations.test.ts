import { readFile } from "node:fs/promises";
import { createClient, type Client } from "@libsql/client";
import { describe, expect, it } from "vitest";

async function migrationStatements(name: string) {
  const source = await readFile(new URL(`../../../drizzle/${name}`, import.meta.url), "utf8");
  return source
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean)
    .map((sql) => ({ sql, args: [] }));
}

async function applyMigration(client: Client, name: string) {
  await client.migrate(await migrationStatements(name));
}

async function seedLegacyBid(client: Client, slot: string, withAllocation = false) {
  await client.batch([
    {
      sql: "INSERT INTO users (id, email, name, password_hash, role, team) VALUES (?, ?, ?, ?, ?, ?)",
      args: ["user-1", "owner@example.com", "Owner", "hash", "APPROVER", "Operations"],
    },
    {
      sql: "INSERT INTO projects (id, name, batch_label, location, status, asset_count, minimum_cash_recovery, minimum_reuse_rate, maximum_pickup_rounds, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["project-1", "Legacy project", "Five groups", "Seoul", "MATCHING", 5, 0, 0, 5, 1],
    },
    {
      sql: "INSERT INTO partners (id, name, type, verification_label, is_verified) VALUES (?, ?, ?, ?, ?)",
      args: ["partner-1", "Partner", "BUSINESS", "Verified", 1],
    },
    ...Array.from({ length: 5 }, (_, index) => ({
      sql: "INSERT INTO asset_groups (id, project_id, name, category, display_order, quantity, condition_grade, condition_label, minimum_recovery, image_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [`asset-${index + 1}`, "project-1", `Asset ${index + 1}`, "OTHER", index + 1, 1, "B", "Good", 0, "/assets/meeting-chair.png"],
    })),
    {
      sql: "INSERT INTO bids (id, project_id, partner_id, slot, quantity, cash_recovery, cost_savings, reuse_quantity, performance_label, performance_rate, pickup_date, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["bid-legacy", "project-1", "partner-1", slot, 1, 1, 0, 1, "Reuse", 100, 1, 1],
    },
  ]);

  if (withAllocation) {
    await client.batch([
      {
        sql: "INSERT INTO match_plans (id, project_id, status, cash_recovery, cost_savings, net_impact, reuse_quantity, reuse_rate, pickup_rounds, criteria_passed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: ["plan-1", "project-1", "DRAFT", 1, 0, 1, 1, 100, 1, 1],
      },
      {
        sql: "INSERT INTO match_allocations (id, match_plan_id, bid_id, partner_id, quantity, cash_recovery, cost_savings, performance_label, performance_rate, pickup_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: ["allocation-1", "plan-1", "bid-legacy", "partner-1", 1, 1, 0, "Reuse", 100, 1],
      },
    ]);
  }
}

async function legacyClient() {
  const client = createClient({ url: "file::memory:" });
  await applyMigration(client, "0000_eager_risque.sql");
  await applyMigration(client, "0001_nasty_blindfold.sql");
  return client;
}

describe("database migrations", () => {
  it("preserves a fifth asset-group bid and its existing allocation", async () => {
    const client = await legacyClient();
    try {
      await seedLegacyBid(client, "E", true);
      await applyMigration(client, "0002_grey_madame_hydra.sql");

      const bid = await client.execute("SELECT id, asset_group_id FROM bids WHERE id = 'bid-legacy'");
      const allocation = await client.execute("SELECT bid_id FROM match_allocations WHERE id = 'allocation-1'");
      const foreignKeyErrors = await client.execute("PRAGMA foreign_key_check");

      expect(bid.rows).toEqual([{ id: "bid-legacy", asset_group_id: "asset-5" }]);
      expect(allocation.rows).toEqual([{ bid_id: "bid-legacy" }]);
      expect(foreignKeyErrors.rows).toHaveLength(0);
    } finally {
      client.close();
    }
  });

  it("aborts and keeps the legacy bid when its slot cannot be mapped", async () => {
    const client = await legacyClient();
    try {
      await seedLegacyBid(client, "Z");

      await expect(applyMigration(client, "0002_grey_madame_hydra.sql")).rejects.toThrow();
      const bids = await client.execute("SELECT id, slot FROM bids");
      const organizations = await client.execute("SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'organizations'");

      expect(bids.rows).toEqual([{ id: "bid-legacy", slot: "Z" }]);
      expect(organizations.rows).toEqual([{ count: 0 }]);
    } finally {
      client.close();
    }
  });

  it("backfills the aggregate recovery floor and enforces cross-table invariants", async () => {
    const client = await legacyClient();
    try {
      await seedLegacyBid(client, "E", true);
      await applyMigration(client, "0002_grey_madame_hydra.sql");
      await client.execute("UPDATE asset_groups SET minimum_recovery = display_order * 10 WHERE project_id = 'project-1'");
      await applyMigration(client, "0003_worthless_martin_li.sql");

      const project = await client.execute("SELECT minimum_cash_recovery, version FROM projects WHERE id = 'project-1'");
      const partner = await client.execute("SELECT verification_reference, verified_at FROM partners WHERE id = 'partner-1'");
      expect(project.rows).toEqual([{ minimum_cash_recovery: 150, version: 1 }]);
      expect(partner.rows[0]?.verification_reference).toBe("legacy:partner-1");
      expect(partner.rows[0]?.verified_at).not.toBeNull();

      await client.batch([
        {
          sql: "INSERT INTO projects (id, organization_id, name, batch_label, location, status, asset_count, minimum_cash_recovery, minimum_reuse_rate, maximum_pickup_rounds, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          args: ["project-2", "org-reroute-demo", "Other", "One", "Seoul", "DRAFT", 1, 0, 0, 1, 1],
        },
        {
          sql: "INSERT INTO asset_groups (id, project_id, name, category, display_order, quantity, condition_grade, condition_label, minimum_recovery, image_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          args: ["asset-other", "project-2", "Other", "OTHER", 1, 1, "B", "Good", 0, "/assets/meeting-chair.png"],
        },
      ]);

      await expect(
        client.execute({
          sql: "INSERT INTO bids (id, project_id, asset_group_id, partner_id, slot, quantity, cash_recovery, cost_savings, reuse_quantity, performance_label, performance_rate, pickup_date, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          args: ["bid-invalid", "project-1", "asset-other", "partner-1", "X", 1, 0, 0, 0, "Reuse", 0, 1, 1],
        }),
      ).rejects.toThrow(/bid_asset_project_mismatch/);

      await expect(
        client.execute({
          sql: "INSERT INTO match_allocations (id, match_plan_id, bid_id, partner_id, quantity, cash_recovery, cost_savings, performance_label, performance_rate, pickup_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          args: ["allocation-invalid", "plan-1", "bid-legacy", "missing-partner", 1, 1, 0, "Reuse", 100, 1],
        }),
      ).rejects.toThrow(/allocation_bid_mismatch/);
    } finally {
      client.close();
    }
  });
});
