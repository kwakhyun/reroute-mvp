import { defineConfig, devices } from "@playwright/test";

const useProductionBuild = process.env.PLAYWRIGHT_USE_PRODUCTION === "true";
const testPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const testBaseUrl = `http://127.0.0.1:${testPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: testBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1024 } } },
  ],
  webServer: {
    command:
      useProductionBuild
        ? "npm run start"
        : `npm run dev -- --hostname 127.0.0.1 --port ${testPort}`,
    env: {
      ...process.env,
      HOSTNAME: "127.0.0.1",
      PORT: testPort,
      ...(useProductionBuild ? { ALLOW_FILE_DATABASE: "true" } : {}),
    },
    url: `${testBaseUrl}/api/health`,
    reuseExistingServer: !process.env.CI && !process.env.PLAYWRIGHT_PORT,
    timeout: 120_000,
  },
});
