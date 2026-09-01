import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/lib/asset-import.ts",
        "src/lib/bid-import.ts",
        "src/lib/csp.ts",
        "src/lib/csv.ts",
        "src/lib/date.ts",
        "src/server/auth/access-policy.ts",
        "src/server/auth/login-rate-limit.ts",
        "src/server/auth/password.ts",
        "src/server/db/url.ts",
        "src/server/security/proxy.ts",
        "src/server/services/matching-engine.ts",
        "src/server/services/matching-policies.ts",
        "src/server/services/operation-policy.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
