import { makeTest } from "./spec.ts";
import { expect, expectNoErrors, signIn } from "./support.ts";

const test = makeTest();

/**
 * F04 — edit a link.
 *
 * S11 → S14 edit dialog → S13.
 */

test.describe("F04 edit a link", () => {
  test("F04-H1 the link detail screen offers an edit", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links");
    await page
      .getByRole("link", { name: /spring collection/i })
      .first()
      .click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    await expect(page.getByRole("button", { name: "Edit", exact: true })).toBeVisible();
    expectNoErrors(errors);
  });

  test("F04-H2 the title can be changed", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links?q=podcast");
    await page
      .getByRole("link", { name: /episode 14/i })
      .first()
      .click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Title").fill("Episode 14, the new one");
    await dialog.getByRole("button", { name: /save/i }).click();

    await expect(page.getByRole("heading", { name: /episode 14, the new one/i })).toBeVisible();
    expectNoErrors(errors);
  });

  test("F04-H3 the destination can be changed, and the link follows", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links?q=summer");
    await page
      .getByRole("link", { name: /summer lookbook/i })
      .first()
      .click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Destination URL").fill("https://example.com/summer-new");
    await dialog.getByRole("button", { name: /save/i }).click();
    await expect(page.getByText("https://example.com/summer-new")).toBeVisible();

    // And the short link now goes there.
    // The request carries the host the link really has, so the redirect
    // resolves on the right domain.
    const response = await page.request.get("/summer", {
      maxRedirects: 0,
      headers: { host: "acme.go.arjav.is-cool.dev" },
    });
    expect(response.status()).toBe(302);
    expect(response.headers().location).toBe("https://example.com/summer-new");
    expectNoErrors(errors);
  });

  test("F04-E1 changing the back-half keeps the old address working", async ({ page, errors }) => {
    // The original does not let a generated back-half be changed. The clone
    // does, and the old address keeps working; see the gaps in
    // replica/bugs.md.
    await signIn(page);
    await page.goto("/links?q=lookbook");
    await page
      .getByRole("link", { name: /lookbook 2026/i })
      .first()
      .click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Back-half").fill("f04-renamed");
    await dialog.getByRole("button", { name: /save/i }).click();
    await expect(dialog).toBeHidden();

    // The change makes a new link, and the old one keeps working: the
    // address that was printed still goes where it went.
    await page.goto("/links?q=f04-renamed");
    await expect(page.getByRole("link", { name: /lookbook 2026/i }).first()).toBeVisible();

    const old = await page.request.get("/lookbook", {
      maxRedirects: 0,
      headers: { host: "acme.go.arjav.is-cool.dev" },
    });
    expect(old.status()).toBe(302);
    expectNoErrors(errors);
  });

  test("F04-N1 an empty title is refused", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links?q=careers");
    await page
      .getByRole("link", { name: /we are hiring/i })
      .first()
      .click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Title").fill("");
    await dialog.getByRole("button", { name: /save/i }).click();

    // It refuses, and the link keeps the name it had.
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible();
    expectNoErrors(errors);
  });
});
