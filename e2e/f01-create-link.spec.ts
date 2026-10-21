import { makeTest } from "./spec.ts";
import { axeCheck, expect, expectNoErrors, signIn, TEST_PASSWORD } from "./support.ts";

const test = makeTest();

/**
 * F01 — create a short link. The core loop.
 *
 * S07 dashboard → S12 create link dialog → S13 link detail.
 */

/** The workspace's own domain, the one every workspace gets for free. */
const DEFAULT_DOMAIN = "acme.go.arjav.is-cool.dev";
/** The custom domain in the fixture. It is added, but its DNS is not set up. */
const CUSTOM_DOMAIN = "acme.studio";

test.describe("F01 create a short link", () => {
  test("F01-H1 the happy path", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links");
    await page.getByRole("link", { name: "New link", exact: true }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Destination URL").fill("https://example.com/spring-collection");
    await dialog.getByLabel("Back-half").fill("f01-happy");
    await dialog.getByLabel("Title").fill("Spring collection");
    await dialog.getByLabel("Tags").fill("launch, spring");
    await dialog.getByRole("button", { name: "Create link" }).click();

    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /spring collection/i })).toBeVisible();

    // The short link is on the page, and it is the one that was asked for.
    await expect(page.getByText(/f01-happy/).first()).toBeVisible();

    expectNoErrors(errors);
    await axeCheck(page);
  });

  test("F01-H2 the form starts on the workspace's own domain", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links?new=1");

    const dialog = page.getByRole("dialog");
    // The select is a button, not a text box, so the value is the text on it.
    const domain = dialog.getByRole("combobox", { name: "Domain" });
    await expect(domain).toHaveText(new RegExp(DEFAULT_DOMAIN));

    // The custom domain is offered too, and marked, because its DNS is not
    // set up.
    await domain.click();
    await expect(page.getByRole("option", { name: new RegExp(CUSTOM_DOMAIN) })).toBeVisible();
    expectNoErrors(errors);
  });

  test("F01-E1 a destination that is not a URL is refused", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links?new=1");

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Destination URL").fill("not a url");
    await dialog.getByRole("button", { name: "Create link" }).click();

    // The browser's own check refuses it, so the page never leaves the
    // dialog and no link is made.
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\/links/);
    expectNoErrors(errors);
  });

  test("F01-E2 a back-half that is taken is refused", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links?new=1");

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Destination URL").fill("https://example.com/other");
    await dialog.getByLabel("Back-half").fill("spring");
    await dialog.getByRole("button", { name: "Create link" }).click();

    await expect(dialog.getByRole("alert")).toContainText(/already taken/i);
    await expect(page).toHaveURL(/\/links/);
    expectNoErrors(errors);
  });

  test("F01-E3 a back-half with a forbidden character is refused", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links?new=1");

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Destination URL").fill("https://example.com/other");
    await dialog.getByLabel("Back-half").fill("has spaces");
    await dialog.getByRole("button", { name: "Create link" }).click();

    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\/links/);
    expectNoErrors(errors);
  });

  test("F01-E4 a back-half that shadows an app route is refused", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links?new=1");

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Destination URL").fill("https://example.com/other");
    await dialog.getByLabel("Back-half").fill("dashboard");
    await dialog.getByRole("button", { name: "Create link" }).click();

    await expect(dialog.getByRole("alert")).toContainText(/reserved/i);
    expectNoErrors(errors);
  });

  test("F01-E8 the submit button pressed twice makes one link", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links?new=1");

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Destination URL").fill("https://example.com/double");
    await dialog.getByLabel("Back-half").fill("f01-double");
    const submit = dialog.getByRole("button", { name: "Create link" });
    // Two clicks in one go, the way a double click arrives.
    await submit.dblclick();

    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    await page.goto("/links?q=f01-double");
    await expect(page.getByRole("row", { name: /f01-double/ })).toHaveCount(1);
    expectNoErrors(errors);
  });

  test("F01-N1 the same destination twice makes two links", async ({ page, errors }) => {
    await signIn(page);
    const destination = "https://example.com/duplicate-destination";

    await page.goto("/links?new=1");
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel("Destination URL").fill(destination);
    await dialog.getByLabel("Back-half").fill("f01-dup-1");
    await dialog.getByRole("button", { name: "Create link" }).click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    await page.goto("/links?new=1");
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Destination URL").fill(destination);
    await dialog.getByLabel("Back-half").fill("f01-dup-2");
    await dialog.getByRole("button", { name: "Create link" }).click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    expectNoErrors(errors);
  });

  test("F01-N3 a brand-new account can make its first link", async ({ page, errors }) => {
    // The whole product, from nothing: a person signs up, a workspace is
    // created, and the first link goes on the workspace's own domain.
    await page.goto("/sign-up");
    await page.getByLabel("Your name").fill("E2E New");
    await page.getByLabel("Workspace name").fill("E2E New Workspace");
    await page.getByLabel("Email").fill("e2e-new@example.com");
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();

    await page.waitForURL(/\/(dashboard|links)/, { timeout: 30_000 });

    await page.goto("/links?new=1");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // The new workspace has a domain of its own.
    const domain = dialog.getByRole("combobox", { name: "Domain" });
    await expect(domain).toHaveText(/e2e-new-workspace\./);

    await dialog.getByLabel("Destination URL").fill("https://example.com/first-link");
    await dialog.getByLabel("Back-half").fill("first");
    await dialog.getByRole("button", { name: "Create link" }).click();

    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /first-link|first/i })).toBeVisible();
    expectNoErrors(errors);
  });

  test("F01-N2 another workspace cannot see the link", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links?new=1");
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Destination URL").fill("https://example.com/isolated");
    await dialog.getByLabel("Back-half").fill("f01-isolated");
    await dialog.getByRole("button", { name: "Create link" }).click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    const linkId = page.url().split("/").pop();

    const other = await page.context().browser()!.newContext({ storageState: undefined });
    const otherPage = await other.newPage();
    await otherPage.goto("/sign-in");
    await otherPage.getByLabel("Email").fill("sam@example.com");
    await otherPage.getByLabel("Password").fill(TEST_PASSWORD);
    await otherPage.getByRole("button", { name: "Sign in" }).click();
    await otherPage.waitForURL(/\/(dashboard|links)/, { timeout: 20_000 });

    const response = await otherPage.goto(`/links/${linkId}`);
    expect(response?.status()).toBe(404);
    await other.close();

    expectNoErrors(errors);
  });
});
