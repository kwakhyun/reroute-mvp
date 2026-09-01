import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "node:path";

const configuredUrl = process.env.DATABASE_URL?.trim();
if (!configuredUrl) {
  throw new Error("DATABASE_URL is required for the runtime migration job");
}

const url = configuredUrl.startsWith("file:")
  ? `file:${path.resolve(process.cwd(), configuredUrl.slice("file:".length))}`
  : configuredUrl;
if (url.startsWith("file:") && process.env.ALLOW_FILE_DATABASE !== "true") {
  throw new Error("Runtime file database migrations require ALLOW_FILE_DATABASE=true");
}

const authToken = process.env.DATABASE_AUTH_TOKEN?.trim() || undefined;
if (url.startsWith("libsql://") && !authToken) {
  throw new Error("DATABASE_AUTH_TOKEN is required for libSQL migrations");
}

const client = createClient({ url, authToken });
try {
  await migrate(drizzle(client), { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  console.info("Runtime database migrations applied.");
} finally {
  client.close();
}
