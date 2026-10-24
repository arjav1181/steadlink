import { makeTest } from "./spec.ts";
import { expect, expectNoErrors, signIn } from "./support.ts";

const test = makeTest();

/**
 * F02 — a branded link: the workspace's own domain, and a custom one.
 *
 * S12 → S42 pick a domain → S12 back-half → S13.
 */

const DEFAULT_DOMAIN = "acme.go.arjav.is-cool.dev";
const CUSTOM_DOMAIN = "acme.studio";

test.describe("F02 branded links", () => {
  test("F02-H1 a link on the workspace's own domain", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links?new=1");

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Destination URL").fill("https://example.com/branded");
    await dialog.getByLabel("Back-half").fill("f02-default");
    await dialog.getByRole("button", { name: "Make the link" }).click();

    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    await expect(page.getByText(new RegExp(DEFAULT_DOMAIN)).first()).toBeVisible();
    expectNoErrors(errors);
  });

  test("F02-H2 the domain menu offers the custom domain and says it is pending", async ({
    page,
    errors,
  }) => {
    await signIn(page);
    await page.goto("/links?new=1");

    const dialog = page.getByRole("dialog");
    const domain = dialog.getByRole("combobox", { name: "Domain" });
    await domain.click();
    const option = page.getByRole("option", { name: new RegExp(CUSTOM_DOMAIN) });
    await expect(option).toBeVisible();
    await expect(option).toContainText(/pending DNS/i);
    expectNoErrors(errors);
  });

  test("F02-E1 the same back-half on two domains makes two links", async ({ page, errors }) => {
    await signIn(page);

    await page.goto("/links?new=1");
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel("Destination URL").fill("https://example.com/one");
    await dialog.getByLabel("Back-half").fill("f02-shared");
    await dialog.getByRole("button", { name: "Make the link" }).click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    await page.goto("/links?new=1");
    dialog = page.getByRole("dialog");
    await dialog.getByRole("combobox", { name: "Domain" }).click();
    await page.getByRole("option", { name: /acme\.studio/ }).click();
    await dialog.getByLabel("Destination URL").fill("https://example.com/two");
    await dialog.getByLabel("Back-half").fill("f02-shared");
    await dialog.getByRole("button", { name: "Make the link" }).click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    expectNoErrors(errors);
  });

  test("F02-E2 a deleted back-half is free again", async ({ page, errors }) => {
    // The original keeps a back-half for good, so a printed link cannot be
    // taken over. The clone frees it; see BUG-016 in replica/bugs.md.
    await signIn(page);

    // Make one.
    await page.goto("/links?new=1");
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel("Destination URL").fill("https://example.com/burnt");
    await dialog.getByLabel("Back-half").fill("f02-burnt");
    await dialog.getByRole("button", { name: "Make the link" }).click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    // Delete it.
    await page.getByRole("button", { name: "More actions for this link" }).click();
    await page.getByRole("menuitem", { name: /delete link/i }).click();
    await page.getByRole("button", { name: "Delete the link" }).click();
    await page.waitForURL(/\/links$/, { timeout: 20_000 });

    // Try to take it again. The clone allows it.
    await page.goto("/links?new=1");
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Destination URL").fill("https://example.com/burnt-again");
    await dialog.getByLabel("Back-half").fill("f02-burnt");
    await dialog.getByRole("button", { name: "Make the link" }).click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    expectNoErrors(errors);
  });

  test("F02-N1 another workspace's domain is not in the menu", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links?new=1");

    const dialog = page.getByRole("dialog");
    const options = await dialog
      .getByRole("combobox", { name: "Domain" })
      .locator("option")
      .allTextContents();
    // Northwind Coffee owns northwind.coffee. It is not offered here.
    expect(options.join(" ")).not.toContain("northwind.coffee");
    expectNoErrors(errors);
  });
});
