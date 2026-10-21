import { makeTest } from "./spec.ts";
import { expect, expectNoErrors, signIn } from "./support.ts";

const test = makeTest();

/**
 * The QR designer: a logo, a line of text, and a file in the format a
 * printer wants.
 *
 * The design belongs to the code, so it survives the code being edited,
 * and the file that is downloaded is drawn from the design rather than
 * from the back-half alone.
 */

/** A one-pixel PNG. Small enough to be a logo, real enough to be a file. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("the QR designer", () => {
  test("a code takes a logo and a line of text", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/qr?new=1");

    await page.getByLabel("Destination URL").fill("https://example.com/designed");
    await page.getByLabel("Title").fill("Designed code");
    await page.getByRole("button", { name: "Design your code" }).click();

    await page.getByLabel("Text under the code").fill("Scan me for the menu");
    await page.getByLabel(/Drop a logo/).setInputFiles({
      name: "logo.png",
      mimeType: "image/png",
      buffer: PNG,
    });

    // The preview shows what was chosen, before anything is saved.
    await expect(page.getByText("Scan me for the menu")).toBeVisible();

    await page.getByRole("button", { name: "Create your code" }).click();
    await page.waitForURL(/\/qr\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    // And the saved code keeps both.
    await expect(page.getByRole("heading", { name: /designed code/i })).toBeVisible();
    await expect(page.getByText("Scan me for the menu")).toBeVisible();
    expectNoErrors(errors);
  });

  test("a file that is not a picture is refused", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/qr?new=1");

    await page.getByLabel("Destination URL").fill("https://example.com/not-a-picture");
    await page.getByRole("button", { name: "Design your code" }).click();

    await page.getByLabel(/Drop a logo/).setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not a picture"),
    });

    await expect(page.getByRole("alert").filter({ hasText: "not a PNG" })).toBeVisible();
    expectNoErrors(errors);
  });

  test("the design survives the code being edited", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/qr?new=1");

    await page.getByLabel("Destination URL").fill("https://example.com/edited-later");
    await page.getByLabel("Title").fill("Edited later");
    await page.getByRole("button", { name: "Design your code" }).click();
    await page.getByLabel("Text under the code").fill("Kept after the edit");
    await page.getByRole("button", { name: "Create your code" }).click();
    await page.waitForURL(/\/qr\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    await page.getByRole("button", { name: "Edit design" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Text under the code")).toHaveValue("Kept after the edit");
    expectNoErrors(errors);
  });
});

test.describe("downloading a code", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/qr");
    await page
      .getByRole("link", { name: /cafe menu/i })
      .first()
      .click();
    await page.waitForURL(/\/qr\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  });

  test("the code can be downloaded as a picture", async ({ page, errors }) => {
    await page.getByRole("button", { name: "Download" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Download PNG" })).toBeVisible();

    const download = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Download PNG" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.png$/);
    expectNoErrors(errors);
  });

  test("the code can be downloaded as a JPEG", async ({ page, errors }) => {
    await page.getByRole("button", { name: "Download" }).click();
    const dialog = page.getByRole("dialog");

    const download = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Download JPEG" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.jpg$/);
    expectNoErrors(errors);
  });

  test("the code can be downloaded as a vector", async ({ page, errors }) => {
    await page.getByRole("button", { name: "Download" }).click();
    const dialog = page.getByRole("dialog");

    const download = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Download SVG" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.svg$/);
    expectNoErrors(errors);
  });
});
