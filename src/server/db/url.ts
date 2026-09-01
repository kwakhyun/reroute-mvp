import path from "node:path";

export function normalizeDatabaseUrl(url: string, cwd = process.cwd()) {
  if (!url.startsWith("file:")) {
    return url;
  }

  const filePath = url.slice("file:".length);
  if (path.isAbsolute(filePath)) {
    return url;
  }

  const runningFromStandalone =
    path.basename(cwd) === "standalone" && path.basename(path.dirname(cwd)) === ".next";
  const root = runningFromStandalone ? path.resolve(cwd, "../..") : cwd;

  return `file:${path.resolve(root, filePath)}`;
}

type DatabaseEnvironment = Partial<Pick<
  NodeJS.ProcessEnv,
  "NODE_ENV" | "NEXT_PHASE" | "DATABASE_URL" | "DATABASE_AUTH_TOKEN" | "ALLOW_FILE_DATABASE"
>>;

export function resolveDatabaseConfig(environment: DatabaseEnvironment, cwd = process.cwd()) {
  const production = environment.NODE_ENV === "production";
  const productionRuntime = production && environment.NEXT_PHASE !== "phase-production-build";
  const configuredUrl = environment.DATABASE_URL?.trim();
  if (productionRuntime && !configuredUrl) {
    throw new Error("DATABASE_URL is required in production");
  }

  const url = normalizeDatabaseUrl(configuredUrl || "file:./data/reroute.db", cwd);
  if (productionRuntime && url.startsWith("file:") && environment.ALLOW_FILE_DATABASE !== "true") {
    throw new Error("Production file databases require ALLOW_FILE_DATABASE=true and a persistent volume");
  }
  const authToken = environment.DATABASE_AUTH_TOKEN?.trim() || undefined;
  if (url.startsWith("libsql://") && !authToken) {
    throw new Error("DATABASE_AUTH_TOKEN is required for libsql databases");
  }
  return { url, authToken };
}
