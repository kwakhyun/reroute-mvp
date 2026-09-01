import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { resolveDatabaseConfig } from "./url";

const { url, authToken } = resolveDatabaseConfig(process.env);

const globalForDatabase = globalThis as unknown as {
  rerouteDatabaseClient?: ReturnType<typeof createClient>;
};

const client =
  globalForDatabase.rerouteDatabaseClient ??
  createClient({
    url,
    authToken,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.rerouteDatabaseClient = client;
}

export const db = drizzle(client, { schema });
export { client as databaseClient };
