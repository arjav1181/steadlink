/**
 * Shared helpers for the end-to-end suite.
 *
 * The selectors are roles and labels, never classes, so a spec keeps working
 * when the design changes. The only thing this file knows about the markup
 * is what a person can see: what a control is called, and what it is for.
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import postgres from "postgres";

/** The password every seeded test account has. */
export const TEST_PASSWORD = "steadlink-demo-password";

/** The people the seed creates. */
export const USERS = {
  /** The owner of the first workspace, "Acme Studio". */
  owner: { email: "arjav@example.com", name: "Arjav" },
  /** A member of the same workspace. */
  member: { email: "mira@example.com", name: "Mira Okonkwo" },
  /** The owner of the second workspace, "Northwind Coffee". */
  other: { email: "sam@example.com", name: "Sam Iverson" },
} as const;

export type UserKey = keyof typeof USERS;

const DATABASE_NAME = process.env.E2E_DATABASE_NAME ?? "steadlink_test";
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? `postgres://steadlink:steadlink@127.0.0.1:55440/${DATABASE_NAME}`;

/** A direct connection to the test database, for the assertions the page cannot make. */
export function db() {
  return postgres(DATABASE_URL, { max: 1, onnotice: () => undefined });
}

/**
 * A connection that can read the tables the app role cannot.
 *
 * It is the superuser on the suite's own database, not the maintenance
 * database: the point is to see the rows the row level security policies
 * hide from the application.
 */
export function adminDb() {
  return postgres(
    process.env.E2E_SUPER_URL ??
      `postgres://postgres:postgres@127.0.0.1:55440/${process.env.E2E_DATABASE_NAME ?? "steadlink_test"}`,
    { max: 1, onnotice: () => undefined },
  );
}

/**
 * Make sure the page is signed in.
 *
 * The suite keeps one session, made by the global setup, and every test
 * starts with it. So this only has to do the work when the session is not
 * there — a context made inside a test, for instance.
 */
export async function signIn(page: Page, who: UserKey = "owner") {
  const user = USERS[who];
  await page.goto("/dashboard");
  if (!page.url().includes("/sign-in")) return;

  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(dashboard|links)/, { timeout: 20_000 });
}

/** Sign in through the form, the way a person does. */
export async function signInWithTheForm(page: Page, who: UserKey = "owner") {
  const user = USERS[who];
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(dashboard|links)/, { timeout: 20_000 });
}

/** Sign in as somebody who is not in the workspace, to prove the isolation. */
export async function signInAsOther(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(USERS.other.email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(dashboard|links)/, { timeout: 20_000 });
}

/**
 * The guard rails.
 *
 * A console error or a server error is a defect, so a spec fails on one
 * even when the assertions below it pass. Without this, a broken page that
 * still renders its heading looks like a pass.
 */
export function watchForErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    // Chromium's text for a failed request does not say which request it
    // was, and "a 404 somewhere on the page" is not a report anyone can act
    // on. The location is the URL.
    const where = message.location().url;
    errors.push(where ? `console: ${message.text()} (${where})` : `console: ${message.text()}`);
  });
  page.on("pageerror", (error) => {
    errors.push(`page error: ${error.message}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      errors.push(`${response.status()} on ${response.url()}`);
    }
  });
  return errors;
}

/** Fail the test if the page logged an error or the server returned a 5xx. */
export function expectNoErrors(errors: string[]) {
  expect(errors, `the page reported errors:\n${errors.join("\n")}`).toEqual([]);
}

/**
 * The accessibility scan.
 *
 * Only the serious rules are on. The full rule set flags things a screen
 * reader user does not notice and a sighted user cannot see either, and a
 * report nobody reads is a report nobody fixes.
 */
export async function axeCheck(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(
    serious.map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length})`),
    "the page has accessibility violations",
  ).toEqual([]);
  return results.violations;
}

export { expect };

/**
 * Put the seeded data back.
 *
 * The specs share one database, and some of them change it: a link is
 * archived here, a campaign is made there. Without this, a spec runs
 * against the world the earlier spec left behind, and a failure says
 * nothing about the code.
 *
 * It is the same seed the development database uses, not a copy of it.
 */
export async function reseed() {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  await run(process.execPath, ["--experimental-strip-types", "scripts/e2e-reseed.ts"], {
    cwd: process.cwd(),
    env: process.env,
  });
}
