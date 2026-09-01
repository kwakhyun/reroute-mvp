import { mkdir } from "node:fs/promises";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "../src/server/db/connection";

async function main() {
  await mkdir("data", { recursive: true });
  await migrate(db, { migrationsFolder: "drizzle" });
  console.info("Database migrations applied.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
