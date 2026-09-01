const config = {
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./data/reroute.db",
  },
  strict: true,
  verbose: true,
};

export default config;
