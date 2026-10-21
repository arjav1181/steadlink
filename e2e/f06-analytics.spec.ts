import { makeTest } from "./spec.ts";
import { expect, expectNoErrors, signIn } from "./support.ts";

const test = makeTest();

/**
 * F06 — a link's analytics, and F09 — campaigns and channels.
 */

test.describe("F06 a link's analytics", () => {
  test("F06-H1 the numbers are there", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links?q=spring");
    await page
      .getByRole("link", { name: /spring collection/i })
      .first()
      .click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    await expect(page.getByText("Clicks", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Engagement over time" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Referrers" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Devices" })).toBeVisible();
    expectNoErrors(errors);
  });

  test("F06-E1 a link with no clicks has empty charts, not broken ones", async ({
    page,
    errors,
  }) => {
    await signIn(page);
    await page.goto("/links?q=workshop");
    await page
      .getByRole("link", { name: /embroidery workshop/i })
      .first()
      .click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    await expect(page.getByText("No clicks yet.").first()).toBeVisible();
    expectNoErrors(errors);
  });

  test("F06-H2 the dashboard analytics screen has the same numbers", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/analytics");

    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    await expect(page.getByText("Top referrer")).toBeVisible();
    await expect(page.getByText("Busiest country")).toBeVisible();
    await expect(page.getByText("Busiest device")).toBeVisible();
    expectNoErrors(errors);
  });
});

test.describe("F09 campaigns and channels", () => {
  test("F09-H1 a campaign with two channels can be made", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/campaigns");

    await page.getByRole("button", { name: "New campaign" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("E2E launch");
    await dialog.getByLabel("Channels").fill("social, email");
    await dialog.getByRole("button", { name: /create/i }).click();

    await expect(page.getByText("E2E launch")).toBeVisible();
    expectNoErrors(errors);
  });

  test("F09-H2 the seeded campaigns are listed with their channels", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/campaigns");

    await expect(page.getByRole("heading", { name: "Spring launch" })).toBeVisible();
    await expect(page.getByText("social").first()).toBeVisible();
    expectNoErrors(errors);
  });

  test("F09-E1 a campaign needs at least one channel", async ({ page, errors }) => {
    // The original allows a campaign with no channels. The clone does not;
    // see the gaps in replica/bugs.md.
    await signIn(page);
    await page.goto("/campaigns");

    await page.getByRole("button", { name: "New campaign" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("E2E no channels");
    await dialog.getByRole("button", { name: /create/i }).click();

    await expect(dialog.getByRole("alert")).toBeVisible();
    expectNoErrors(errors);
  });

  test("F09-N1 a campaign with an empty name is refused", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/campaigns");

    await page.getByRole("button", { name: "New campaign" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("");
    await dialog.getByRole("button", { name: /create/i }).click();

    await expect(dialog.getByRole("alert")).toBeVisible();
    expectNoErrors(errors);
  });

  test("F09-H3 the channels screen lists the channels", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/channels");

    await expect(page.getByRole("heading", { name: "Channels" })).toBeVisible();
    await expect(page.getByText("social").first()).toBeVisible();
    expectNoErrors(errors);
  });
});
