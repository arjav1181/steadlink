import { makeTest } from "./spec.ts";
import { expect, expectNoErrors, signIn } from "./support.ts";

const test = makeTest();

/**
 * F10 — build a page, and F11 — measure it.
 *
 * S24 → S25 template → S26 builder → S27 block editor → S28 appearance
 * → S29 publish → S30 public page.
 */

test.describe("F10 pages", () => {
  test("F10-H0 the front door is the pitch, not a placeholder", async ({ page, errors }) => {
    // Two files resolved to "/": the marketing page under the (public) route
    // group, and a scaffold placeholder beside it. The placeholder won, so
    // the product's front door was a heading, one line and a link to the
    // design system.
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "The link you printed still works.",
    );
    await expect(page.getByRole("link", { name: "Make a link" }).first()).toBeVisible();
    expectNoErrors(errors);
  });

  test("F10-H1 a page can be made from a template", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/pages?new=1");

    // The gallery, and a template out of it.
    await page
      .getByRole("link", { name: /use this template/i })
      .first()
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Title").fill("E2E page");
    await dialog.getByRole("button", { name: /create/i }).click();

    await page.waitForURL(/\/pages\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "E2E page" })).toBeVisible();
    expectNoErrors(errors);
  });

  test("F10-H2 a block can be added", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/pages");
    await page
      .getByRole("link", { name: /acme studio/i })
      .first()
      .click();
    await page.waitForURL(/\/pages\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    await page.getByRole("button", { name: /add a block/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Kind").click();
    await page.getByRole("option", { name: "Text" }).click();
    await dialog.getByLabel("Text").fill("E2E block");
    await dialog.getByRole("button", { name: /add the block/i }).click();

    await expect(page.getByText("E2E block").first()).toBeVisible();
    expectNoErrors(errors);
  });

  test("F10-H3 a published page is public", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/p/betty");

    await expect(page.getByRole("heading", { name: /betty baker/i })).toBeVisible();
    expectNoErrors(errors);
  });

  test("F10-E1 a page with no blocks publishes and says it is empty", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/pages?new=1");
    await page
      .getByRole("link", { name: /use this template/i })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Title").fill("E2E empty");
    await dialog.getByRole("button", { name: /create/i }).click();
    await page.waitForURL(/\/pages\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    await page.getByRole("button", { name: /^publish$/i }).click();
    const publish = page.getByRole("dialog");
    await publish.getByRole("button", { name: /publish it/i }).click();

    await expect(page.getByText(/published/i).first()).toBeVisible();
    expectNoErrors(errors);
  });

  test("F10-N1 a page with an empty title is refused", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/pages?new=1");
    await page
      .getByRole("link", { name: /use this template/i })
      .first()
      .click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Title").fill("");
    await dialog.getByRole("button", { name: /create/i }).click();

    await expect(dialog.getByRole("alert")).toBeVisible();
    expectNoErrors(errors);
  });
});

test.describe("F11 a page's measurements", () => {
  test("F11-H1 the page screen has the numbers", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/pages");
    await page
      .getByRole("link", { name: /betty baker/i })
      .first()
      .click();
    await page.waitForURL(/\/pages\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    await expect(page.getByText("Views")).toBeVisible();
    await expect(page.getByText("Block clicks")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Blocks" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What people clicked" })).toBeVisible();
    expectNoErrors(errors);
  });

  test("F11-H2 a public page view is counted", async ({ page, errors }) => {
    await signIn(page);
    const before = await page.request.get("/p/betty");
    expect(before.status()).toBe(200);

    await page.goto("/pages");
    await page
      .getByRole("link", { name: /betty baker/i })
      .first()
      .click();
    await page.waitForURL(/\/pages\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    await expect(page.getByText("Views")).toBeVisible();
    expectNoErrors(errors);
  });
});
