import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];

async function migrationStatements(name: string) {
  const source = await readFile(new URL(`../../../drizzle/${name}`, import.meta.url), "utf8");
  return source
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean)
    .map((sql) => ({ sql, args: [] }));
}

async function currentDatabase() {
  const directory = await mkdtemp(path.join(tmpdir(), "reroute-race-"));
  temporaryDirectories.push(directory);
  const url = `file:${path.join(directory, "race.db")}`;
  const client = createClient({ url });
  for (const migration of [
    "0000_eager_risque.sql",
    "0001_nasty_blindfold.sql",
    "0002_grey_madame_hydra.sql",
    "0003_worthless_martin_li.sql",
  ]) {
    await client.migrate(await migrationStatements(migration));
  }
  await client.batch([
    { sql: "INSERT INTO users (id, email, name, password_hash, role, team) VALUES ('user-1', 'a@example.com', 'A', 'hash', 'APPROVER', 'Ops')", args: [] },
    { sql: "INSERT INTO projects (id, organization_id, name, batch_label, location, status, asset_count, minimum_cash_recovery, minimum_reuse_rate, maximum_pickup_rounds, updated_at) VALUES ('project-1', 'org-reroute-demo', 'Race', 'One', 'Seoul', 'MATCHING', 1, 100, 0, 1, 1)", args: [] },
    { sql: "INSERT INTO asset_groups (id, project_id, name, category, display_order, quantity, condition_grade, condition_label, minimum_recovery, image_path) VALUES ('asset-1', 'project-1', 'Chair', 'CHAIR', 1, 1, 'B', 'Good', 100, '/assets/meeting-chair.png')", args: [] },
    { sql: "INSERT INTO partners (id, name, type, verification_label, verification_reference, verified_at, verified_by, is_verified) VALUES ('partner-1', 'Partner', 'BUSINESS', 'Operator verified', 'evidence-1', 1, 'user-1', 1)", args: [] },
    { sql: "INSERT INTO bids (id, project_id, asset_group_id, partner_id, slot, quantity, cash_recovery, cost_savings, reuse_quantity, performance_label, performance_rate, pickup_date, submitted_at) VALUES ('bid-1', 'project-1', 'asset-1', 'partner-1', 'G1', 1, 100, 0, 1, 'Reuse', 100, 1, 1)", args: [] },
    { sql: "INSERT INTO match_plans (id, project_id, status, cash_recovery, cost_savings, net_impact, reuse_quantity, reuse_rate, pickup_rounds, criteria_passed) VALUES ('plan-old', 'project-1', 'DRAFT', 100, 0, 100, 1, 100, 1, 1)", args: [] },
    { sql: "INSERT INTO match_allocations (id, match_plan_id, bid_id, partner_id, quantity, cash_recovery, cost_savings, performance_label, performance_rate, pickup_date) VALUES ('allocation-old', 'plan-old', 'bid-1', 'partner-1', 1, 100, 0, 'Reuse', 100, 1)", args: [] },
  ]);
  return { url, client };
}

async function recalculate(client: Client) {
  const transaction = await client.transaction("write");
  try {
    const updated = await transaction.execute(
      "UPDATE projects SET status = 'MATCHING', version = version + 1 WHERE id = 'project-1' AND version = 1 AND status <> 'CONFIRMED' RETURNING id",
    );
    if (updated.rows.length !== 1) throw new Error("recalculation_conflict");
    await transaction.execute("DELETE FROM match_allocations WHERE match_plan_id IN (SELECT id FROM match_plans WHERE project_id = 'project-1' AND status = 'DRAFT')");
    await transaction.execute("DELETE FROM match_plans WHERE project_id = 'project-1' AND status = 'DRAFT'");
    await transaction.execute("INSERT INTO match_plans (id, project_id, status, cash_recovery, cost_savings, net_impact, reuse_quantity, reuse_rate, pickup_rounds, criteria_passed) VALUES ('plan-new', 'project-1', 'DRAFT', 100, 0, 100, 1, 100, 1, 1)");
    await transaction.commit();
    return "recalculated";
  } finally {
    transaction.close();
  }
}

async function confirm(client: Client) {
  const transaction = await client.transaction("write");
  try {
    const plan = await transaction.execute("UPDATE match_plans SET status = 'CONFIRMED' WHERE id = 'plan-old' AND status = 'DRAFT' RETURNING id");
    if (plan.rows.length !== 1) throw new Error("confirmation_conflict");
    const project = await transaction.execute("UPDATE projects SET status = 'CONFIRMED', version = version + 1 WHERE id = 'project-1' AND version = 1 AND status <> 'CONFIRMED' RETURNING id");
    if (project.rows.length !== 1) throw new Error("confirmation_conflict");
    await transaction.commit();
    return "confirmed";
  } finally {
    transaction.close();
  }
}

afterEach(async () => {
  for (const directory of temporaryDirectories.splice(0)) await rm(directory, { recursive: true, force: true });
});

describe("matching write concurrency", () => {
  it("allows only one stale-version recalculation or confirmation to commit", async () => {
    const { url, client } = await currentDatabase();
    const peer = createClient({ url });
    try {
      const outcomes = await Promise.allSettled([recalculate(client), confirm(peer)]);
      expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);

      const project = await client.execute("SELECT status, version FROM projects WHERE id = 'project-1'");
      expect(project.rows[0]?.version).toBe(2);
      if (project.rows[0]?.status === "CONFIRMED") {
        expect((await client.execute("SELECT status FROM match_plans WHERE id = 'plan-old'")).rows).toEqual([{ status: "CONFIRMED" }]);
        expect((await client.execute("SELECT id FROM match_allocations WHERE id = 'allocation-old'")).rows).toHaveLength(1);
      } else {
        expect(project.rows[0]?.status).toBe("MATCHING");
        expect((await client.execute("SELECT id FROM match_plans WHERE id = 'plan-new'")).rows).toEqual([{ id: "plan-new" }]);
        expect((await client.execute("SELECT id FROM match_plans WHERE id = 'plan-old'")).rows).toHaveLength(0);
      }
    } finally {
      peer.close();
      client.close();
    }
  });
});
