import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:19230",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "PORT=19230 BASE_PATH=/ pnpm --filter @workspace/mama-maternal-access run dev",
    url: "http://127.0.0.1:19230/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});