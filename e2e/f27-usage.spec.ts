import { makeTest } from "./spec.ts";
import { axeCheck, expect, expectNoErrors, signIn } from "./support.ts";

const test = makeTest();

/**
 * F27 — the product does not meter what it does not sell.
 *
 * The dashboard used to carry a badge reading "N links left this month": a
 * quota copied from a paid product, computed against a counter that never
 * resets to a month and a limit that nothing enforces. The launch copy says
 * the software is not metered, so the screens have to say the same thing.
 */

test.describe("F27 no meter", () => {
  test("F27-H0 the dashboard counts links, it does not ration them", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "In this workspace" })).toBeVisible();
    await expect(page.getByText(/links left this month/i)).toHaveCount(0);
    await expect(page.getByText(/monthly limit reached/i)).toHaveCount(0);
    await expect(page.getByText(/\/\s*1,000/)).toHaveCount(0);

    expectNoErrors(errors);
  });

  test("F27-H1 the usage page is counts, not a bill", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/settings/usage");

    await expect(page.getByRole("heading", { level: 1, name: "Usage" })).toBeVisible();
    await expect(page.getByText(/nothing here is metered/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Download the CSV" })).toBeVisible();

    // The old page sold a plan: a "Billing and usage" title, a plan name, a
    // price sentence and limit bars.
    await expect(page.getByText(/billing and usage/i)).toHaveCount(0);
    await expect(page.getByText(/community plan/i)).toHaveCount(0);
    await expect(page.getByRole("progressbar")).toHaveCount(0);

    await axeCheck(page);
    expectNoErrors(errors);
  });
});
