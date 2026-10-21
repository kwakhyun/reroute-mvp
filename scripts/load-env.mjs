import nextEnv from "@next/env";

// Match next dev by default; production and test explicitly use their own files.
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
