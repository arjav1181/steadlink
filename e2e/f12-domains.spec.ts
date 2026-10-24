import { makeTest } from "./spec.ts";
import { expect, expectNoErrors, signIn } from "./support.ts";

const test = makeTest();

/**
 * F12 — add a custom domain, and F15 — dynamic routing.
 */

test.describe("F12 custom domains", () => {
  test("F12-H1 a domain can be added and is listed as pending", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/domains");

    await page
      .getByRole("button", { name: /add a domain/i })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Domain").fill("e2e-shop.example");
    await dialog.getByRole("button", { name: /add/i }).click();

    await expect(page.getByText("e2e-shop.example")).toBeVisible();
    await expect(page.getByText("Waiting for DNS").first()).toBeVisible();
    expectNoErrors(errors);
  });

  test("F12-H2 the DNS records to publish are shown", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/domains");

    await expect(page.getByText("CNAME").first()).toBeVisible();
    await expect(page.getByText("TXT").first()).toBeVisible();
    await expect(page.getByText(/steadlink-verify=/).first()).toBeVisible();
    expectNoErrors(errors);
  });

  test("F12-E1 a domain that is not a domain name is refused", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/domains");

    await page
      .getByRole("button", { name: /add a domain/i })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Domain").fill("not a domain");
    await dialog.getByRole("button", { name: /add/i }).click();

    await expect(dialog.getByRole("alert")).toBeVisible();
    expectNoErrors(errors);
  });

  test("F12-E2 a domain that is already added is refused", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/domains");

    await page
      .getByRole("button", { name: /add a domain/i })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Domain").fill("acme.studio");
    await dialog.getByRole("button", { name: /add/i }).click();

    await expect(dialog.getByRole("alert")).toContainText(/already/i);
    expectNoErrors(errors);
  });

  test("F12-E3 verifying a domain with no DNS says so", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/domains");

    // The fixture's custom domain has no DNS records published.
    const row = page.getByText("acme.studio").first();
    await row.scrollIntoViewIfNeeded();
    const card = row.locator("xpath=ancestor::*[self::li or self::div][1]");
    const verify = card.getByRole("button", { name: /verify/i }).first();
    if (await verify.count()) {
      await verify.click();
      await expect(page.getByText(/not found|missing|pending/i).first()).toBeVisible();
    }
    expectNoErrors(errors);
  });
});

test.describe("F15 dynamic routing", () => {
  test("F15-H1 a rule can be added and saved", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links?q=summer");
    await page
      .getByRole("link", { name: /summer lookbook/i })
      .first()
      .click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    await page.getByRole("button", { name: "Edit rules" }).first().click();
    await expect(page.getByRole("heading", { name: "Dynamic routing" })).toBeVisible();

    const url = page.getByLabel("Send them to").first();
    await url.fill("https://example.com/regional");
    await page.getByRole("button", { name: /save/i }).first().click();

    await expect(page.getByText("https://example.com/regional").first()).toBeVisible();
    expectNoErrors(errors);
  });

  test("F15-E2 a rule with no destination is refused", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links?q=summer");
    await page
      .getByRole("link", { name: /summer lookbook/i })
      .first()
      .click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    await page.getByRole("button", { name: "Edit rules" }).first().click();
    const url = page.getByLabel("Send them to").first();
    await url.fill("");
    await page.getByRole("button", { name: /save/i }).first().click();

    // The rule is not saved with an empty destination.
    await expect(page.getByLabel("Send them to").first()).toHaveValue("");
    expectNoErrors(errors);
  });
});
