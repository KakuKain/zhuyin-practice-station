import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173/";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 12_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "android-chromium", use: { ...devices["Pixel 7"], browserName: "chromium" } },
    { name: "iphone-webkit", use: { ...devices["iPhone 13"], browserName: "webkit" } },
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command:
      process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ??
      "npm run start -- --hostname 127.0.0.1 --port 4173",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
