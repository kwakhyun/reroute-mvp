import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const localTransactions = new Map<string, Promise<void>>();

export function createDatabase(client: ReturnType<typeof createClient>, url: string) {
  const database = drizzle(client, { schema });
  if (!url.startsWith("file:")) return database;

  // The native file driver can leave statements active when BEGIN overlaps
  // another connection's write. Serialize local transactions per database file.
  // Remote databases still rely on their transaction isolation and our CAS checks.
  const transaction = database.transaction.bind(database);
  database.transaction = async (callback, config) => {
    const previous = localTransactions.get(url) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => { release = resolve; });
    localTransactions.set(url, current);
    await previous;
    try {
      return await transaction(callback, config);
    } finally {
      release();
      if (localTransactions.get(url) === current) localTransactions.delete(url);
    }
  };
  return database;
}
