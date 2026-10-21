/**
 * The global setup.
 *
 * The database was already reset and seeded by `scripts/e2e-server.sh`,
 * before the application started. What is left is to prove the fixture is
 * usable: sign in as the owner through the real form, and keep the session
 * so the specs do not have to sign in again for every test.
 *
 * If this fails, the suite stops before it starts, rather than failing
 * twenty specs for the same reason.
 */

import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import { chromium, type FullConfig } from "@playwright/test";

import { TEST_PASSWORD, USERS } from "./support.ts";

const PORT = Number(process.env.E2E_PORT ?? 3311);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const AUTH_DIR = path.join(process.cwd(), "e2e", ".auth");

const CHROMIUM = process.env.E2E_CHROMIUM || undefined;

export default async function globalSetup(_config: FullConfig) {
  // The web server plugin has already waited for the sign-in page, but the
  // first request compiles the page, so give it a moment to answer.
  const deadline = Date.now() + 120_000;
  let ready = false;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE_URL}/sign-in`);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error(`the application never answered at ${BASE_URL}`);

  if (!existsSync(AUTH_DIR)) mkdirSync(AUTH_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROMIUM,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/sign-in`);
    await page.getByLabel("Email").fill(USERS.owner.email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/(dashboard|links)/, { timeout: 30_000 });
    await context.storageState({ path: path.join(AUTH_DIR, "owner.json") });

    // The other workspace's owner, for the isolation checks.
    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await otherPage.goto(`${BASE_URL}/sign-in`);
    await otherPage.getByLabel("Email").fill(USERS.other.email);
    await otherPage.getByLabel("Password").fill(TEST_PASSWORD);
    await otherPage.getByRole("button", { name: "Sign in" }).click();
    await otherPage.waitForURL(/\/(dashboard|links)/, { timeout: 30_000 });
    await otherContext.storageState({ path: path.join(AUTH_DIR, "other.json") });
  } finally {
    await browser.close();
  }

  console.log("fixture ready: the owner of Acme Studio can sign in");
}
