import { defineConfig, devices } from "@playwright/test";

/**
 * The end-to-end suite.
 *
 * The application is started by Playwright, against its own database, as the
 * unprivileged `steadlink` role. The database is reset from the migrations and
 * the seed before the application starts, so every run sees the same rows.
 *
 * The specs share one database and most of them change it, so they run one
 * at a time. The suite is about the flows, not about how fast the machine
 * is.
 *
 * `E2E_CHROMIUM` points at a Chromium build when the machine's own does not
 * work. Left empty, Playwright uses the browser it downloaded.
 */

const PORT = Number(process.env.E2E_PORT ?? 3311);
const BASE_URL = `http://127.0.0.1:${PORT}`;

const chromiumPath = process.env.E2E_CHROMIUM || undefined;

export default defineConfig({
  testDir: "./e2e",
  // The artifacts of a run live with the plan and the bug list.
  outputDir: "../replica/e2e-results",
  globalSetup: "./e2e/global-setup.ts",

  // One worker: the specs share a database, and a flow that hides a link
  // would change what the next spec sees.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: process.env.CI
    ? [["github"], ["html", { outputFolder: "../replica/e2e-report", open: "never" }]]
    : [["list"], ["html", { outputFolder: "../replica/e2e-report", open: "never" }]],

  use: {
    baseURL: BASE_URL,
    // The session is made once, by the global setup, and every test starts
    // with it. Signing in on every test would run into the rate limit that
    // protects a real install — ten sign-ins a minute — and a test that
    // fails because of a rate limit says nothing about the code.
    storageState: "e2e/.auth/owner.json",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        launchOptions: {
          executablePath: chromiumPath,
          // Containers usually have no user namespaces.
          args: ["--no-sandbox", "--disable-dev-shm-usage"],
        },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 5"],
        launchOptions: {
          executablePath: chromiumPath,
          args: ["--no-sandbox", "--disable-dev-shm-usage"],
        },
      },
    },
  ],

  webServer: {
    command: "bash scripts/e2e-server.sh",
    url: `${BASE_URL}/sign-in`,
    // Never reuse a server that is already there: it would be running
    // against a database that is not the one this run set up, and the
    // suite would be testing yesterday's rows.
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
