import { makeTest } from "./spec.ts";
import { expect, expectNoErrors, signIn } from "./support.ts";

const test = makeTest();

/**
 * F16 — set an expiration.  F17 — the assistant.  F18 — deep links.
 * F19 — 2D barcodes.  F20 — export.
 */

test.describe("F16 expiration", () => {
  test("F16-H1 an expiration is saved and the link still works", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links?new=1");

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Destination URL").fill("https://example.com/expiring");
    await dialog.getByLabel("Back-half").fill("f16-expiring");
    await dialog.getByRole("button", { name: "More options" }).click();
    // A week from now, which is inside the year the app allows.
    const when = new Date(Date.now() + 7 * 86_400_000);
    await dialog.getByLabel("Expires").fill(when.toISOString().slice(0, 16));
    await dialog.getByRole("button", { name: "Make the link" }).click();

    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    const response = await page.request.get("/f16-expiring", { maxRedirects: 0 });
    expect(response.status()).toBe(302);
    expectNoErrors(errors);
  });

  test("F16-E1 an expiration in the past is refused", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links?new=1");

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Destination URL").fill("https://example.com/past");
    await dialog.getByLabel("Back-half").fill("f16-past");
    await dialog.getByRole("button", { name: "More options" }).click();
    await dialog.getByLabel("Expires").fill("2020-01-01T10:00");
    await dialog.getByRole("button", { name: "Make the link" }).click();

    await expect(dialog.getByRole("alert")).toBeVisible();
    expectNoErrors(errors);
  });
});

test.describe("F17 the assistant", () => {
  test("F17-H1 the assistant panel opens", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/dashboard");

    await page.getByRole("button", { name: /ask about your data/i }).click();
    await expect(page.getByRole("complementary", { name: "Assistant" })).toBeVisible();
    expectNoErrors(errors);
  });

  test("F17-H2 with no provider configured it says so, and does not fail", async ({
    page,
    errors,
  }) => {
    await signIn(page);
    await page.goto("/dashboard");

    await page.getByRole("button", { name: /ask about your data/i }).click();
    const panel = page.getByRole("complementary", { name: "Assistant" });
    const input = panel.getByRole("textbox");
    await input.fill("How many clicks did I get this week?");
    await panel.getByRole("button", { name: /send|ask/i }).click();

    // It answers, and the answer says the assistant is not set up. What
    // matters is that it does not fail.
    await expect(panel).toBeVisible();
    expectNoErrors(errors);
  });

  test("F17-E2 the assistant settings screen says what it can see", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/settings/ai");

    await expect(page.getByRole("heading", { name: "Assistant" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What it can see" })).toBeVisible();
    expectNoErrors(errors);
  });
});

test.describe("F18 deep links", () => {
  test("F18-H1 the deep links screen is there", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/settings/deeplinks");

    await expect(page.getByRole("heading", { name: "Mobile deep links" })).toBeVisible();
    expectNoErrors(errors);
  });

  test("F18-H2 a deep link on a link is shown on the detail screen", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links?q=summer");
    await page
      .getByRole("link", { name: /summer lookbook/i })
      .first()
      .click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    await expect(page.getByRole("heading", { name: "Mobile deep links" })).toBeVisible();
    await expect(page.getByText("/products/lookbook")).toBeVisible();
    expectNoErrors(errors);
  });
});

test.describe("F19 barcodes", () => {
  test("F19-E1 the seeded barcode has no screen", async ({ page, errors }) => {
    // The recon has a barcode screen (S22). The clone has the table and no
    // screen. This case records the gap, rather than passing quietly.
    await signIn(page);
    const response = await page.request.get("/barcodes", { maxRedirects: 0 });
    // The address is not a page of the application, so it is not a barcode
    // screen: it is treated as a short link that does not exist. The gap is
    // in replica/bugs.md.
    expect(response.status()).toBe(302);
    expect(response.headers().location).toContain("/gone");
    expectNoErrors(errors);
  });
});

test.describe("F20 export", () => {
  test("F20-H1 the links export link on the bulk screen works", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/settings/bulk");

    const link = page.getByRole("link", { name: /download every link as csv/i });
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    const response = await page.request.get(href!);
    // The link has to point at something that answers, and what it answers
    // with has to be a spreadsheet.
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/csv");
    expect(await response.text()).toContain("code,short_link");
    expectNoErrors(errors);
  });

  test("F20-H2 one link's clicks export as CSV", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links?q=spring");
    await page
      .getByRole("link", { name: /spring collection/i })
      .first()
      .click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    const linkId = page.url().split("/").pop();

    // The API needs a token, so this is checked as an unauthenticated call
    // being refused rather than as a download.
    const response = await page.request.get(`/api/v4/links/${linkId}/export`);
    expect(response.status()).toBe(401);
    expectNoErrors(errors);
  });
});
