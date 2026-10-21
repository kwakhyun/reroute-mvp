import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const projectRoot = process.cwd();
const loader = path.join(projectRoot, "scripts/load-env.mjs");
let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "reroute-cli-env-"));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

function childEnvironment(overrides: Partial<NodeJS.ProcessEnv> = {}) {
  const environment = { ...process.env };
  for (const key of ["DATABASE_URL", "DATABASE_AUTH_TOKEN", "NODE_ENV", "__NEXT_PROCESSED_ENV", "CLI_ENV_LABEL", "CLI_ENV_EXPANDED", "ALLOW_FILE_DATABASE"]) {
    delete environment[key];
  }
  return { ...environment, ...overrides };
}

async function inspectEnvironment(overrides: Partial<NodeJS.ProcessEnv> = {}, preload = loader) {
  const { stdout } = await execFileAsync(process.execPath, [
    "--import", preload, "--input-type=module", "--eval",
    "console.log(JSON.stringify({ url: process.env.DATABASE_URL, label: process.env.CLI_ENV_LABEL, expanded: process.env.CLI_ENV_EXPANDED }))",
  ], { cwd: directory, env: childEnvironment(overrides), timeout: 10_000 });
  return JSON.parse(stdout.trim());
}

describe("database CLI environment", () => {
  it("loads local overrides and expands variables before a CLI runs", async () => {
    await writeFile(path.join(directory, ".env"), "DATABASE_URL=file:./data/base.db\nCLI_ENV_LABEL=base\n");
    await writeFile(path.join(directory, ".env.development"), "DATABASE_URL=file:./data/development.db\n");
    await writeFile(path.join(directory, ".env.local"), "DATABASE_URL=file:./data/local.db\nCLI_ENV_LABEL=local\nCLI_ENV_EXPANDED=$CLI_ENV_LABEL/expanded\n");
    expect(await inspectEnvironment()).toEqual({ url: "file:./data/local.db", label: "local", expanded: "local/expanded" });
  }, 15_000);

  it.each(["development", "production"] as const)("uses %s local overrides and preserves explicit process variables", async (mode) => {
    await writeFile(path.join(directory, ".env.local"), "DATABASE_URL=file:./data/local.db\n");
    await writeFile(path.join(directory, `.env.${mode}.local`), `DATABASE_URL=file:./data/${mode}.db\n`);
    expect(await inspectEnvironment({ NODE_ENV: mode })).toEqual({ url: `file:./data/${mode}.db` });
    expect(await inspectEnvironment({ NODE_ENV: mode, DATABASE_URL: "file:./data/explicit.db" })).toEqual({ url: "file:./data/explicit.db" });
  }, 25_000);

  it("ignores .env.local in test mode", async () => {
    await writeFile(path.join(directory, ".env.local"), "DATABASE_URL=file:./data/local.db\n");
    await writeFile(path.join(directory, ".env.test"), "DATABASE_URL=file:./data/test.db\n");
    expect(await inspectEnvironment({ NODE_ENV: "test" })).toEqual({ url: "file:./data/test.db" });
  }, 15_000);

  it("starts the app with the same production precedence as database commands", async () => {
    await writeFile(path.join(directory, ".env.local"), "DATABASE_URL=file:./data/local.db\n");
    await writeFile(path.join(directory, ".env.production.local"), "DATABASE_URL=file:./data/production.db\n");
    const production = await inspectEnvironment({}, path.join(projectRoot, "scripts/load-production-env.mjs"));
    expect(production).toEqual({ url: "file:./data/production.db" });
    expect(await inspectEnvironment({ NODE_ENV: "production" })).toEqual(production);
  }, 25_000);

  it("refuses an unsafe reset URL loaded from .env.local without deleting the file", async () => {
    await mkdir(path.join(directory, "data"));
    const outside = path.join(directory, "outside.db");
    await writeFile(outside, "must survive");
    await writeFile(path.join(directory, ".env.local"), "DATABASE_URL=file:./data/../outside.db\n");
    const reset = execFileAsync(process.execPath, ["--import", loader, "--import", import.meta.resolve("tsx"), path.join(projectRoot, "scripts/reset-db.ts")], {
      cwd: directory,
      env: childEnvironment({ TSX_TSCONFIG_PATH: path.join(projectRoot, "tsconfig.json") }),
      timeout: 10_000,
    });
    await expect(reset).rejects.toMatchObject({ stderr: expect.stringContaining("db:reset only accepts") });
    expect(await readFile(outside, "utf8")).toBe("must survive");
  }, 15_000);

  it("initializes the database connection after loading .env.local", async () => {
    await mkdir(path.join(directory, "data"));
    await writeFile(path.join(directory, ".env.local"), "DATABASE_URL=file:./data/selected.db\n");
    const environment = childEnvironment({ TSX_TSCONFIG_PATH: path.join(projectRoot, "tsconfig.json") });
    const moduleUrl = pathToFileURL(path.join(projectRoot, "src/server/db/connection.ts")).href;
    const { stdout } = await execFileAsync(process.execPath, [
      "--import", loader, "--import", import.meta.resolve("tsx"), "--input-type=module", "--eval",
      `const { databaseClient } = await import(${JSON.stringify(moduleUrl)}); try { console.log(JSON.stringify((await databaseClient.execute("PRAGMA database_list")).rows)); } finally { databaseClient.close(); }`,
    ], { cwd: directory, env: environment, timeout: 20_000 });
    expect(JSON.parse(stdout.trim())).toContainEqual(expect.objectContaining({ name: "main", file: path.join(await realpath(directory), "data", "selected.db") }));
  }, 30_000);
});
