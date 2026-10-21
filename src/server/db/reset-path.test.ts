import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveResetDatabasePath } from "./reset-path";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "reroute-reset-path-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("database reset path", () => {
  it("accepts a missing database and a regular file under data", async () => {
    const target = await resolveResetDatabasePath("file:./data/reroute.db", root);
    expect(target).toContain(`${path.sep}data${path.sep}reroute.db`);
    await mkdir(path.join(root, "data"));
    await writeFile(target, "test database");
    expect(await resolveResetDatabasePath(`file:${target}`, root)).toBe(target);
    expect(await resolveResetDatabasePath("file:./data/nested/../reroute.db", root)).toBe(target);
    expect(await readFile(target, "utf8")).toBe("test database");
  });

  it.each([
    "file:./data/../outside.db",
    "file:./data/../../outside.db",
    "file:./data/%2e%2e/outside.db",
    "file:./data/a%2Fb/../target.db",
    "file:./data/a%5Cb/../target.db",
    "file:./data-other/outside.db",
    "file:./data",
    "file:./data/.",
    "file:./data/reroute.db?mode=ro",
    "file:./data/reroute.db#fragment",
    "file:./data/%00.db",
    "file:./data/%.db",
    "file://localhost/data/reroute.db",
    "file:",
    "libsql://remote.example.com",
  ])("rejects unsafe or ambiguous database URL %s", async (url) => {
    await expect(resolveResetDatabasePath(url, root)).rejects.toThrow("db:reset only accepts");
  });

  it("rejects a database directory", async () => {
    await mkdir(path.join(root, "data", "directory.db"), { recursive: true });
    await expect(resolveResetDatabasePath("file:./data/directory.db", root)).rejects.toThrow("db:reset only accepts");
  });

  it.each(["data", "directory", "database"])("rejects a symbolic link at the %s boundary", async (component) => {
    const outside = path.join(root, "outside");
    await mkdir(outside);
    const outsideDatabase = path.join(outside, "outside.db");
    await writeFile(outsideDatabase, "must survive");
    let url: string;
    if (component === "data") {
      await symlink(outside, path.join(root, "data"));
      url = "file:./data/outside.db";
    } else {
      await mkdir(path.join(root, "data"));
      if (component === "directory") {
        await symlink(outside, path.join(root, "data", "linked"));
        url = "file:./data/linked/outside.db";
      } else {
        await symlink(outsideDatabase, path.join(root, "data", "linked.db"));
        url = "file:./data/linked.db";
      }
    }
    await expect(resolveResetDatabasePath(url, root)).rejects.toThrow("db:reset only accepts");
    expect(await readFile(outsideDatabase, "utf8")).toBe("must survive");
  });
});
