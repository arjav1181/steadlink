import { makeTest } from "./spec.ts";
import { adminDb, expect, expectNoErrors, signIn } from "./support.ts";

const test = makeTest();

/**
 * A webhook that never hears anything is a webhook that is not there.
 *
 * The subscriber's URL is never called from the request that caused the
 * event: the event puts a delivery in a queue, and a worker empties the
 * queue. This proves the first half — that something happens, something
 * is queued, and the person can see it queued.
 */

const DOMAIN = "acme.go.arjav.is-cool.dev";

test.describe("the webhook queue", () => {
  test("a click puts a delivery in the queue", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/settings/webhooks");

    // A webhook that wants to hear about every click.
    await page.getByRole("button", { name: /new webhook/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("Queued hook");
    await dialog.getByLabel("URL").fill("https://hooks.example.com/queued");
    await dialog.getByRole("button", { name: /create/i }).click();
    await expect(page.getByText("Queued hook")).toBeVisible();

    const before = await queuedDeliveries();

    // Something happens.
    const response = await page.request.get("/spring", {
      maxRedirects: 0,
      headers: { host: DOMAIN },
    });
    expect(response.status()).toBe(302);

    // And a delivery is waiting for the worker to send it.
    await expect
      .poll(async () => (await queuedDeliveries()) - before, { timeout: 10_000 })
      .toBeGreaterThan(0);

    // The person can see it queued.
    await page.goto("/settings/webhooks");
    await expect(page.getByText("engagement").first()).toBeVisible();
    await expect(page.getByText("pending").first()).toBeVisible();
    expectNoErrors(errors);
  });

  test("a link that is made puts a delivery in the queue", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/settings/webhooks");

    await page.getByRole("button", { name: /new webhook/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("Link hook");
    await dialog.getByLabel("Event").click();
    await page.getByRole("option", { name: /link created/i }).click();
    await dialog.getByLabel("URL").fill("https://hooks.example.com/links");
    await dialog.getByRole("button", { name: /create/i }).click();
    await expect(page.getByText("Link hook")).toBeVisible();

    const before = await queuedDeliveries();

    await page.goto("/links?new=1");
    const create = page.getByRole("dialog");
    await create.getByLabel("Destination URL").fill("https://example.com/queued-link");
    await create.getByLabel("Back-half").fill("f25-queued-link");
    await create.getByLabel("Title").fill("Queued link");
    await create.getByRole("button", { name: "Create link" }).click();
    await page.waitForURL(/\/links\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    await expect
      .poll(async () => (await queuedDeliveries()) - before, { timeout: 10_000 })
      .toBeGreaterThan(0);

    await page.goto("/settings/webhooks");
    await expect(page.getByText("link.created").first()).toBeVisible();
    expectNoErrors(errors);
  });

  test("a delivery carries the link and the click", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/settings/webhooks");

    await page.getByRole("button", { name: /new webhook/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("Payload hook");
    await dialog.getByLabel("URL").fill("https://hooks.example.com/payload");
    await dialog.getByRole("button", { name: /create/i }).click();

    await page.request.get("/spring", { maxRedirects: 0, headers: { host: DOMAIN } });

    // The engagement write is not awaited before the redirect goes out,
    // so the delivery lands a moment after the answer.
    let payload: Record<string, unknown> | undefined;
    await expect
      .poll(
        async () => {
          const sql = await adminDb();
          const rows = await sql`
            select payload from webhook_deliveries
            where payload -> 'link' ->> 'code' = 'spring'
            order by created_at desc
            limit 1
          `;
          await sql.end();
          payload = rows[0]?.payload as Record<string, unknown> | undefined;
          return payload ? "found" : "waiting";
        },
        { timeout: 10_000 },
      )
      .toBe("found");

    expect(payload?.event).toBe("engagement");
    const link = payload?.link as { code?: string; long_url?: string } | undefined;
    expect(link?.code).toBe("spring");
    expect(link?.long_url).toBe("https://example.com/collections/spring");
    const click = payload?.click as { type?: string } | undefined;
    expect(click?.type).toBe("click");
    expectNoErrors(errors);
  });
});

/** How many deliveries are waiting in the queue. */
async function queuedDeliveries(): Promise<number> {
  const sql = await adminDb();
  const rows = await sql`
    select count(*)::int as count from webhook_deliveries
    where status = 'pending'
  `;
  await sql.end();
  return rows[0]?.count ?? 0;
}
