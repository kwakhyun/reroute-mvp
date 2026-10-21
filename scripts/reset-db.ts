import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolveResetDatabasePath } from "../src/server/db/reset-path";

const databaseUrl = process.env.DATABASE_URL ?? "file:./data/reroute.db";

async function run(script: "db:migrate" | "db:seed") {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("npm", ["run", script], { stdio: "inherit", shell: false });
    child.once("error", reject);
    child.once("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${script} exited with ${code}`))));
  });
}

async function main() {
  const databasePath = await resolveResetDatabasePath(databaseUrl);
  // Migrations and seeding must use the exact same validated, decoded file.
  process.env.DATABASE_URL = pathToFileURL(databasePath).href;
  await rm(databasePath, { force: true });
  await run("db:migrate");
  await run("db:seed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
