import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeDatabaseUrl, resolveDatabaseConfig } from "./url";

describe("database URL normalization", () => {
  it("resolves the project data path from a Next.js standalone directory", () => {
    const projectRoot = path.join(path.sep, "workspace", "reroute");
    const standalone = path.join(projectRoot, ".next", "standalone");

    expect(normalizeDatabaseUrl("file:./data/reroute.db", standalone)).toBe(
      `file:${path.join(projectRoot, "data", "reroute.db")}`,
    );
  });

  it("keeps remote and absolute URLs unchanged", () => {
    expect(normalizeDatabaseUrl("libsql://database.example.com", "/workspace")).toBe(
      "libsql://database.example.com",
    );
    expect(normalizeDatabaseUrl("file:/var/data/reroute.db", "/workspace")).toBe(
      "file:/var/data/reroute.db",
    );
  });
});

describe("database configuration", () => {
  it("fails closed when production has no explicit database URL", () => {
    expect(() => resolveDatabaseConfig({ NODE_ENV: "production" }, "/workspace")).toThrow("DATABASE_URL is required");
  });

  it("requires an explicit persistent-file opt-in in production", () => {
    expect(() => resolveDatabaseConfig({ NODE_ENV: "production", DATABASE_URL: "file:/app/data/reroute.db" }, "/workspace")).toThrow("ALLOW_FILE_DATABASE");
    expect(resolveDatabaseConfig({ NODE_ENV: "production", DATABASE_URL: "file:/app/data/reroute.db", ALLOW_FILE_DATABASE: "true" }, "/workspace").url).toBe("file:/app/data/reroute.db");
  });

  it("requires a token for remote libsql", () => {
    expect(() => resolveDatabaseConfig({ NODE_ENV: "production", DATABASE_URL: "libsql://db.example.com" }, "/workspace")).toThrow("DATABASE_AUTH_TOKEN");
  });
});
