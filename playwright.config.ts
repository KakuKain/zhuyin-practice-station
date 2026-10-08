import { defineConfig, devices } from "@playwright/test";

// Tests run against the same static build that GitHub Pages serves, under the same base path.
const base = process.env.PAGES_BASE_PATH ?? "/zhuyin-practice-station/";
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4176);
const baseURL = `http://127.0.0.1:${port}${base}`;

// The main device is an Android tablet written on with a capacitive stylus, which the
// browser reports as touch. A Redmi Pad class screen is about 800 × 1280 CSS pixels.
const androidTablet = { ...devices["Galaxy Tab S9"], deviceScaleFactor: 1.5 };

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
    {
      name: "android-tablet",
      use: { ...androidTablet, viewport: { width: 800, height: 1280 } },
    },
    {
      name: "android-tablet-landscape",
      use: { ...androidTablet, viewport: { width: 1280, height: 800 } },
    },
    { name: "ipad-webkit", use: { ...devices["iPad (gen 7)"] } },
    { name: "android-phone", use: { ...devices["Pixel 7"] } },
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    // Always serve the build that was just made, never a leftover dev server.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
