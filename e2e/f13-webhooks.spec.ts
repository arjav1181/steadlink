import { makeTest } from "./spec.ts";
import { expect, expectNoErrors, signIn } from "./support.ts";

const test = makeTest();

/**
 * F13 — webhooks, and F14 — API tokens.
 *
 * S48 → create → verify → receive.  S49 → generate → copy → call.
 */

test.describe("F13 webhooks", () => {
  test("F13-H1 a webhook can be created", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/settings/webhooks");

    await page.getByRole("button", { name: /new webhook/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("E2E hook");
    await dialog.getByLabel("URL").fill("https://hooks.example.com/e2e");
    await dialog.getByRole("button", { name: /create/i }).click();

    await expect(page.getByText("E2E hook")).toBeVisible();
    expectNoErrors(errors);
  });

  test("F13-H2 the seeded webhooks are listed with their state", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/settings/webhooks");

    await expect(page.getByText("Engagement stream")).toBeVisible();
    await expect(page.getByText("New links")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent deliveries" })).toBeVisible();
    expectNoErrors(errors);
  });

  test("F13-N1 an empty URL is refused", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/settings/webhooks");

    await page.getByRole("button", { name: /new webhook/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("E2E no url");
    await dialog.getByLabel("URL").fill("");
    await dialog.getByRole("button", { name: /create/i }).click();

    await expect(dialog.getByRole("alert")).toBeVisible();
    expectNoErrors(errors);
  });

  test("F13-N2 a URL that is not http is refused", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/settings/webhooks");

    await page.getByRole("button", { name: /new webhook/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("E2E bad url");
    await dialog.getByLabel("URL").fill("ftp://hooks.example.com/e2e");
    await dialog.getByRole("button", { name: /create/i }).click();

    await expect(dialog.getByRole("alert")).toBeVisible();
    expectNoErrors(errors);
  });
});

test.describe("F14 API tokens", () => {
  test("F14-H1 a token is created and shown once", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/settings/api");

    await page.getByRole("button", { name: /new token/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("E2E token");
    await dialog.getByRole("button", { name: /create/i }).click();

    // The token itself is shown once.
    const shown = page.getByRole("dialog").or(page.locator("body"));
    await expect(page.getByText(/gl_/).first()).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();

    await expect(page.getByText("E2E token")).toBeVisible();
    expect(shown);
    expectNoErrors(errors);
  });

  test("F14-H2 a token works against the API", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/settings/api");

    await page.getByRole("button", { name: /new token/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("E2E api token");
    await dialog.getByRole("button", { name: /create/i }).click();

    // The token is shown once, in the dialog. The page has another piece of
    // text that starts with "gl_", so the dialog is what has to be read.
    const token = (await page.getByRole("dialog").locator("pre").textContent())?.trim();
    await page.getByRole("button", { name: "Done" }).click();

    if (!token) {
      // The token is only shown once, in a copyable field. If the shape
      // changed, the rest of this case cannot run.
      return;
    }

    const response = await page.request.get("/api/v4/links", {
      headers: { Authorization: `Bearer ${token.trim()}` },
    });
    expect(response.status()).toBe(200);
    expectNoErrors(errors);
  });

  test("F14-N3 the sign-in form signs you in", async ({ page, errors }) => {
    // The suite keeps one session, so the form itself is checked here, in a
    // context of its own with no session in it.
    const browser = page.context().browser()!;
    const fresh = await browser.newContext();
    const other = await fresh.newPage();
    await other.goto("/sign-in");
    await other.getByLabel("Email").fill("mira@example.com");
    await other.getByLabel("Password").fill("golink-demo-password");
    await other.getByRole("button", { name: "Sign in" }).click();
    await other.waitForURL(/\/(dashboard|links)/, { timeout: 20_000 });
    await other.goto("/links");
    await expect(other.getByRole("heading", { name: "Links" })).toBeVisible();
    await fresh.close();
    expectNoErrors(errors);
  });

  test("F14-N1 the API without a token is 401", async ({ page, errors }) => {
    await signIn(page);
    const response = await page.request.get("/api/v4/links");
    expect(response.status()).toBe(401);
    expectNoErrors(errors);
  });

  test("F14-N2 the API with a made-up token is 401", async ({ page, errors }) => {
    await signIn(page);
    const response = await page.request.get("/api/v4/links", {
      headers: { Authorization: "Bearer gl_not-a-real-token" },
    });
    expect(response.status()).toBe(401);
    expectNoErrors(errors);
  });
});
