import { makeTest } from "./spec.ts";
import { expect, expectNoErrors, signIn } from "./support.ts";

const test = makeTest();

/**
 * F05 — the redirect itself, and F07 — hide, archive, delete.
 *
 * The redirect hot path is the product. It runs without a session and
 * without an organization, because a back-half is a global identifier.
 */

/**
 * The workspace's own domain.
 *
 * A short link lives on a domain, and the server reads the host to know
 * which one — the same way it does on a real install. The request is
 * therefore made with the host the link really has, and the local address
 * is where the server is.
 */
const DOMAIN = "acme.go.arjav.is-cool.dev";

test.describe("F05 the redirect", () => {
  test("F05-H1 a short link goes to its destination", async ({ page, errors }) => {
    await signIn(page);
    const response = await page.request.get("/spring", {
      maxRedirects: 0,
      headers: { host: DOMAIN },
    });
    expect(response.status()).toBe(302);
    expect(response.headers().location).toBe("https://example.com/collections/spring");
    expectNoErrors(errors);
  });

  test("F05-H2 the redirect is counted", async ({ page, errors }) => {
    await signIn(page);
    const before = await page.request.get("/links?q=spring");
    expect(before.status()).toBe(200);

    await page.request.get("/spring", { maxRedirects: 0, headers: { host: DOMAIN } });
    await page.request.get("/spring", { maxRedirects: 0, headers: { host: DOMAIN } });

    await page.goto("/links?q=spring");
    await page
      .getByRole("link", { name: /spring collection/i })
      .first()
      .click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    const clicks = await page.getByText("Clicks").locator("..").getByText(/^\d/);
    await expect(clicks.first()).toBeVisible();
    expectNoErrors(errors);
  });

  test("F05-E2 a hidden link still redirects", async ({ page, errors }) => {
    await signIn(page);

    // "print-ad" is hidden in the fixture.
    const response = await page.request.get("/print-ad", {
      maxRedirects: 0,
      headers: { host: DOMAIN },
    });
    expect(response.status()).toBe(302);
    expect(response.headers().location).toBe("https://example.com/print/spring");
    expectNoErrors(errors);
  });

  test("F05-E3 an archived link goes to the gone screen", async ({ page, errors }) => {
    await signIn(page);
    const response = await page.request.get("/old-promo", {
      maxRedirects: 0,
      headers: { host: DOMAIN },
    });
    expect(response.status()).toBe(302);
    expect(response.headers().location).toContain("/gone?reason=archived");
    expectNoErrors(errors);
  });

  test("F05-E4 an expired link goes to the gone screen", async ({ page, errors }) => {
    await signIn(page);
    const response = await page.request.get("/giveaway", {
      maxRedirects: 0,
      headers: { host: DOMAIN },
    });
    expect(response.status()).toBe(302);
    expect(response.headers().location).toContain("/gone?reason=expired");
    expectNoErrors(errors);
  });

  test("F05-E5 a code that does not exist goes to the gone screen", async ({ page, errors }) => {
    await signIn(page);
    const response = await page.request.get("/no-such-code-at-all", {
      maxRedirects: 0,
      headers: { host: DOMAIN },
    });
    expect(response.status()).toBe(302);
    expect(response.headers().location).toContain("/gone");
    expectNoErrors(errors);
  });
});

test.describe("F07 hide, archive, delete", () => {
  test("F07-H1 hiding a link takes it out of the active list", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links?q=newsletter");
    await page
      .getByRole("link", { name: /april newsletter/i })
      .first()
      .click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    await page.getByRole("button", { name: "Hide" }).click();
    await expect(page.getByText("Hidden")).toBeVisible();

    await page.goto("/links?state=active&q=newsletter");
    await expect(page.getByRole("link", { name: /april newsletter/i })).toHaveCount(0);

    await page.goto("/links?state=hidden&q=newsletter");
    await expect(page.getByRole("link", { name: /april newsletter/i }).first()).toBeVisible();
    expectNoErrors(errors);
  });

  test("F07-H2 archiving a link works", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links?q=workshop");
    await page
      .getByRole("link", { name: /embroidery workshop/i })
      .first()
      .click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    await page.getByRole("button", { name: "More actions for this link" }).click();
    await page.getByRole("menuitem", { name: /archive link/i }).click();
    await expect(page.getByText("Archived")).toBeVisible();
    expectNoErrors(errors);
  });

  test("F07-H3 deleting a link removes it", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links?q=careers");
    await page
      .getByRole("link", { name: /we are hiring/i })
      .first()
      .click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    await page.getByRole("button", { name: "More actions for this link" }).click();
    await page.getByRole("menuitem", { name: /delete link/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Delete the link" }).click();

    await page.waitForURL(/\/links$/, { timeout: 20_000 });
    await page.goto("/links?q=careers");
    await expect(page.getByRole("link", { name: /we are hiring/i })).toHaveCount(0);
    expectNoErrors(errors);
  });

  test("F07-N1 closing the delete dialog deletes nothing", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links?q=showroom");
    await page
      .getByRole("link", { name: /showroom/i })
      .first()
      .click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    await page.getByRole("button", { name: "More actions for this link" }).click();
    await page.getByRole("menuitem", { name: /delete link/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Keep it" }).click();

    await expect(dialog).toBeHidden();
    await page.goto("/links?q=showroom");
    await expect(page.getByRole("link", { name: /showroom/i }).first()).toBeVisible();
    expectNoErrors(errors);
  });
});
