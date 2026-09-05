import { createClient } from "@libsql/client";
import { createDatabase } from "./create-database";
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

export const db = createDatabase(client, url);
export { client as databaseClient };
