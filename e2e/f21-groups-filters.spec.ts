import { makeTest } from "./spec.ts";
import { adminDb, expect, expectNoErrors, signIn } from "./support.ts";

const test = makeTest();

/**
 * The group switcher, and the filters on the list of links.
 *
 * A group partitions a workspace's links and codes. The switcher in the
 * shell says which group is in scope, and every list of links answers
 * from that group and no other.
 *
 * The filters are questions about the list: which campaign, who made it,
 * whether it has a code, whether it has routing rules, and when it
 * expires. The list has to answer them, and it has to be able to show
 * more than one page of links.
 */

test.describe("the group switcher", () => {
  test("the shell says which group is in scope", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links");

    const picker = page.getByLabel("Group", { exact: true });
    await expect(picker).toBeVisible();
    // The seeded workspace has a default group and one other.
    await expect(picker.locator("option")).toHaveCount(2);
    await expect(picker).toHaveValue(/./);
    expectNoErrors(errors);
  });

  test("switching groups changes which links the list holds", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links");

    // The seeded links are in the default group.
    await expect(page.getByRole("link", { name: /spring collection/i }).first()).toBeVisible();

    const picker = page.getByLabel("Group", { exact: true });
    const other = await picker.locator("option").nth(1).getAttribute("value");
    expect(other).toBeTruthy();
    await picker.selectOption(other!);

    // The list is drawn again in the new group, and the seeded links are
    // not in it.
    await expect(page.getByRole("link", { name: /spring collection/i })).toHaveCount(0);
    expectNoErrors(errors);
  });

  test("a link made in a group stays in that group", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links");

    const picker = page.getByLabel("Group", { exact: true });
    const other = await picker.locator("option").nth(1).getAttribute("value");
    await picker.selectOption(other!);

    await page.getByRole("link", { name: "New link", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Destination URL").fill("https://example.com/group-scoped");
    await dialog.getByLabel("Back-half").fill("f21-group-scoped");
    await dialog.getByLabel("Title").fill("Group scoped");
    await dialog.getByRole("button", { name: "Create link" }).click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    // It is in the group that was chosen, and not in the other one.
    await page.goto("/links");
    await expect(page.getByRole("link", { name: /group scoped/i }).first()).toBeVisible();

    const back = await picker.locator("option").first().getAttribute("value");
    await picker.selectOption(back!);
    await expect(page.getByRole("link", { name: /group scoped/i })).toHaveCount(0);
    expectNoErrors(errors);
  });

  test("a group from another workspace is ignored", async ({ page, errors }) => {
    await signIn(page);

    // A group id from the other workspace, put in the cookie by hand.
    const sql = await adminDb();
    const rows = await sql`
      select g.id from groups g
      join organization o on o.id = g.org_id
      where o.slug = 'northwind'
      limit 1
    `;
    await sql.end();
    const foreign = rows[0]?.id as string | undefined;
    expect(foreign).toBeTruthy();

    await page.context().addCookies([
      {
        name: "golink.group",
        value: foreign!,
        url: "http://127.0.0.1:3311",
      },
    ]);

    await page.goto("/links");
    // The workspace's own group is in scope, not the other one.
    const picker = page.getByLabel("Group", { exact: true });
    const value = await picker.inputValue();
    expect(value).not.toBe(foreign);
    await expect(page.getByRole("link", { name: /spring collection/i }).first()).toBeVisible();
    expectNoErrors(errors);
  });
});

test.describe("the filters on the list of links", () => {
  test("a filter narrows the list", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links");

    const before = await page.getByRole("row").count();

    // Only the links made by one person.
    await page.getByLabel("Made by").selectOption({ label: "Mira Okonkwo" });
    await page.waitForURL(/by=/, { timeout: 20_000 });

    const after = await page.getByRole("row").count();
    expect(after).toBeLessThan(before);
    // The filter is shown as a chip, so it can be taken away again.
    await expect(page.getByRole("link", { name: "Clear" }).first()).toBeVisible();
    await expect(page.locator("span").filter({ hasText: "Mira Okonkwo" }).first()).toBeVisible();
    expectNoErrors(errors);
  });

  test("a filter can be taken away again", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/links");

    const before = await page.getByRole("row").count();
    await page.getByLabel("Has a QR code").selectOption("no");
    await page.waitForURL(/qr=no/, { timeout: 20_000 });
    await page.getByRole("link", { name: "Clear" }).first().click();
    await page.waitForURL((url) => !url.searchParams.has("qr"), { timeout: 20_000 });

    expect(await page.getByRole("row").count()).toBe(before);
    expectNoErrors(errors);
  });

  test("the list shows more than one page of links", async ({ page, errors }) => {
    await signIn(page);

    // Enough links that one page cannot hold them.
    await page.goto("/settings/bulk");
    await page.getByLabel("File name").fill("e2e-pages.csv");
    const rows = [
      "long_url,title,code",
      ...Array.from({ length: 60 }, (_, index) => {
        const number = String(index + 1).padStart(2, "0");
        return `https://example.com/page-${number},Page link ${number},f21-page-${number}`;
      }),
    ];
    await page.getByLabel("Rows").fill(rows.join("\n"));
    await page.getByRole("button", { name: "Start the upload" }).click();
    await expect(page.getByText(/60 of 60 created/)).toBeVisible();

    await page.goto("/links?state=all");
    const first = await page.getByRole("row").count();
    expect(first).toBeLessThanOrEqual(51);

    const next = page.getByRole("link", { name: "Next" });
    await expect(next).toBeVisible();
    await next.click();
    await page.waitForURL(/cursor=/, { timeout: 20_000 });

    // The second page holds the links the first one could not show.
    await expect(page.getByText(/Showing \d+ to \d+ of \d+/)).toBeVisible();
    expectNoErrors(errors);
  });
});
