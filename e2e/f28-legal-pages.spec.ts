import { makeTest } from "./spec.ts";
import { axeCheck, expect, expectNoErrors } from "./support.ts";

const test = makeTest();

/**
 * F28 — the legal pages the deploy checklist asks for, before anything goes live.
 *
 * The product is a self-hosted open source service, so the legal surface is
 * small: a privacy page that says where the data lives, and terms that say
 * what running the software means. They had to exist as pages, and the landing
 * had to point at them.
 */

test.describe("F28 legal pages", () => {
  test("F28-H1 the privacy and terms pages are the real pages", async ({ page, errors }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy");
    await expect(page.getByText(/no Steadlink server holding/i)).toBeVisible();

    await page.goto("/terms");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Terms");
    await expect(page.getByText(/MIT license/i).first()).toBeVisible();

    await axeCheck(page);
    expectNoErrors(errors);
  });

  test("F28-H2 the landing links to both legal pages", async ({ page, errors }) => {
    await page.goto("/");

    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("link", { name: "Privacy" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Terms" })).toBeVisible();

    await axeCheck(page);
    expectNoErrors(errors);
  });
});
