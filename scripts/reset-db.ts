import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL ?? "file:./data/reroute.db";
const expectedPrefix = "file:./data/";

if (!databaseUrl.startsWith(expectedPrefix)) {
  throw new Error("db:reset only accepts a local database under ./data");
}

const databasePath = databaseUrl.slice("file:".length);

async function run(script: "db:migrate" | "db:seed") {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("npm", ["run", script], { stdio: "inherit", shell: false });
    child.once("error", reject);
    child.once("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${script} exited with ${code}`))));
  });
}

async function main() {
  await rm(databasePath, { force: true });
  await run("db:migrate");
  await run("db:seed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
