import { makeTest } from "./spec.ts";
import { adminDb, expect, expectNoErrors, signIn } from "./support.ts";

const test = makeTest();

/**
 * The public link checker.
 *
 * It answers one question — where does this link point — for whoever is
 * holding the link. That means it works without an account, and it reads
 * a link rather than following it: a check is not a click, and it must
 * not be counted as one.
 */

test.describe("the public link checker", () => {
  test("it works without an account", async ({ page, errors }) => {
    // A context with no session at all.
    await page.context().clearCookies();
    await page.goto("/check");

    await expect(page.getByRole("heading", { name: /where does this link go/i })).toBeVisible();
    await expect(page.getByLabel("Short link or code")).toBeVisible();
    expectNoErrors(errors);
  });

  test("a live link shows where it points", async ({ page, errors }) => {
    await page.goto("/check");
    await page.getByLabel("Short link or code").fill("acme.go.arjav.is-cool.dev/spring");
    await page.getByRole("button", { name: "Check it" }).click();

    await expect(page.getByText("Active")).toBeVisible();
    await expect(page.getByText(/example\.com/)).toBeVisible();
    expectNoErrors(errors);
  });

  test("a name that is not a link says so", async ({ page, errors }) => {
    await page.goto("/check");
    await page.getByLabel("Short link or code").fill("acme.go.arjav.is-cool.dev/not-a-real-code");
    await page.getByRole("button", { name: "Check it" }).click();

    await expect(page.getByText("Not found")).toBeVisible();
    expectNoErrors(errors);
  });

  test("a retired link says that too", async ({ page, errors }) => {
    await signIn(page);
    // The seeded workspace has a link that was archived, and the list
    // only shows the active ones unless it is asked for the others.
    await page.goto("/links?state=all");
    await page.getByLabel("Search links", { exact: true }).fill("Winter promo");
    await page
      .getByRole("link", { name: /winter promo/i })
      .first()
      .click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    const code = await page
      .locator("a")
      .filter({ hasText: /go\.arjav\.is-cool\.dev/ })
      .first()
      .innerText();
    const short = code.trim();

    await page.context().clearCookies();
    await page.goto("/check");
    await page.getByLabel("Short link or code").fill(short);
    await page.getByRole("button", { name: "Check it" }).click();

    await expect(page.getByText("Retired")).toBeVisible();
    expectNoErrors(errors);
  });

  test("a check is not a click", async ({ page, errors }) => {
    const sql = await adminDb();
    const before = await sql`
      select count(*)::int as clicks from engagement_events
    `;
    await sql.end();

    await page.goto("/check");
    await page.getByLabel("Short link or code").fill("acme.go.arjav.is-cool.dev/spring");
    await page.getByRole("button", { name: "Check it" }).click();
    await expect(page.getByText("Active")).toBeVisible();

    const after = await adminDb();
    const later = await after`
      select count(*)::int as clicks from engagement_events
    `;
    await after.end();

    expect(later[0]?.clicks).toBe(before[0]?.clicks);
    expectNoErrors(errors);
  });
});
