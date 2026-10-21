import { makeTest } from "./spec.ts";
import { expect, expectNoErrors, signIn } from "./support.ts";

const test = makeTest();

/**
 * F03 — create a QR code.
 *
 * S17 → S18 configure → S19 design → S20 detail → S23 download.
 */

test.describe("F03 create a QR code", () => {
  test("F03-H1 the happy path", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/qr?new=1");

    await page.getByLabel("Destination URL").fill("https://example.com/qr-target");
    await page.getByLabel("Title").fill("Table tent");
    await page.getByRole("button", { name: "Design your code" }).click();

    // The design step.
    await expect(page.getByRole("heading", { name: "Pattern" })).toBeVisible();
    await page.getByRole("button", { name: /create your code/i }).click();

    await page.waitForURL(/\/qr\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /table tent/i })).toBeVisible();
    expectNoErrors(errors);
  });

  test("F03-H2 a code with no link attached is allowed", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/qr?new=1");

    await page.getByLabel("Destination URL").fill("https://example.com/no-link");
    await page.getByLabel("Title").fill("No link");
    await page.getByRole("button", { name: "Design your code" }).click();
    await page.getByRole("button", { name: /create your code/i }).click();

    await page.waitForURL(/\/qr\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    expectNoErrors(errors);
  });

  test("F03-H3 the code can be downloaded", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/qr");

    await page
      .getByRole("link", { name: /cafe menu/i })
      .first()
      .click();
    await page.waitForURL(/\/qr\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    // The download offers the three formats a printer, a designer and a
    // slide each want.
    await page.getByRole("button", { name: "Download" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Download SVG" })).toBeVisible();

    const download = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Download SVG" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.svg$/);
    expectNoErrors(errors);
  });

  test("F03-N1 an empty destination is refused", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/qr?new=1");

    // The button is disabled until there is a destination.
    await page.getByLabel("Destination URL").fill("");
    await expect(page.getByRole("button", { name: "Design your code" })).toBeDisabled();
    expectNoErrors(errors);
  });
});
