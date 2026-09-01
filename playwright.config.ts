import { defineConfig, devices } from "@playwright/test";

const useProductionBuild = process.env.PLAYWRIGHT_USE_PRODUCTION === "true";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
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
        : "npm run dev -- --hostname 127.0.0.1 --port 3000",
    env: {
      ...process.env,
      ...(useProductionBuild ? { ALLOW_FILE_DATABASE: "true" } : {}),
    },
    url: "http://127.0.0.1:3000/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
