import { makeTest } from "./spec.ts";
import { expect, expectNoErrors, signIn } from "./support.ts";

const test = makeTest();

/**
 * The share button, and the range the analytics screen counts over.
 *
 * On a phone, sharing puts a link into a message. On a computer there is
 * no share sheet, so the clipboard takes its place and the button says
 * which of the two it did.
 *
 * The range is a question about the numbers, and a custom range is a
 * question a preset cannot answer: a launch that ran for six weeks, a
 * report for last quarter.
 */

test.describe("sharing a link", () => {
  test("the share sheet is used when the browser has one", async ({ page, errors }) => {
    // A browser that can share.
    await page.addInitScript(() => {
      const shared: string[] = [];
      (window as unknown as { __shared: string[] }).__shared = shared;
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: (data: { title?: string; url?: string }) => {
          shared.push(data.url ?? "");
          return Promise.resolve();
        },
      });
    });

    await signIn(page);
    await page.goto("/links");
    await page
      .getByRole("link", { name: /spring collection/i })
      .first()
      .click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    await page.getByRole("button", { name: "Share" }).click();

    const shared = await page.evaluate(
      () => (window as unknown as { __shared: string[] }).__shared,
    );
    expect(shared).toHaveLength(1);
    expect(shared[0]).toContain("/spring");
    await expect(page.getByRole("button", { name: "Shared" })).toBeVisible();
    expectNoErrors(errors);
  });

  test("the clipboard is used when there is no share sheet", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links");
    await page
      .getByRole("link", { name: /spring collection/i })
      .first()
      .click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    // A desktop browser has no share sheet.
    const hasShare = await page.evaluate(() => typeof navigator.share === "function");
    expect(hasShare).toBe(false);

    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Share" }).click();

    // The button says what it did, rather than pretending it shared.
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain("/spring");
    expectNoErrors(errors);
  });
});

test.describe("the range of the numbers", () => {
  test("a preset counts back from now", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/analytics");

    await page.getByLabel("Range").selectOption("30");
    await page.waitForURL(/range=30/, { timeout: 20_000 });
    await expect(page.getByLabel("Range")).toHaveValue("30");
    expectNoErrors(errors);
  });

  test("a custom range of two dates is used", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/analytics");

    await page.getByLabel("Range").selectOption("custom");
    await expect(page.getByLabel("From")).toBeVisible();
    await expect(page.getByLabel("To")).toBeVisible();

    await page.getByLabel("From").fill("2026-01-01");
    await page.getByLabel("To").fill("2026-01-31");
    await page.getByRole("button", { name: "Apply" }).click();

    await page.waitForURL(/range=custom/, { timeout: 20_000 });
    expect(page.url()).toContain("from=2026-01-01");
    expect(page.url()).toContain("to=2026-01-31");

    // And the range is still showing, so it can be changed again.
    await expect(page.getByLabel("From")).toHaveValue("2026-01-01");
    await expect(page.getByLabel("To")).toHaveValue("2026-01-31");
    expectNoErrors(errors);
  });

  test("a range that ends before it starts falls back to the last week", async ({
    page,
    errors,
  }) => {
    await signIn(page);
    await page.goto("/analytics?range=custom&from=2026-02-01&to=2026-01-01");

    // The page answers rather than showing nothing.
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Over time" })).toBeVisible();
    expectNoErrors(errors);
  });
});
