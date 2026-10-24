/**
 * Screenshot the clone's screens for replica-diff.
 *
 *   node scripts/shoot-clone.mjs                    # every screen
 *   node scripts/shoot-clone.mjs S07 S11 S13        # just these
 *
 * Writes replica/clone-screens/S<id>.png at 1440x900, and
 * replica/clone-screens/S<id>-mobile.png at 390x844 for the narrow pass.
 *
 * The screens that need an id (a link, a QR code, a page, a channel) are
 * read from the database the application is running against, so the shots
 * are of the real seeded rows and not of a copy of them.
 *
 * The screens inside the application are shot with a session: the
 * application asks for one, and a shot of the sign-in screen is not a shot
 * of the screen. The session is the one the end-to-end suite made, so the
 * shots are of the same install the tests ran against.
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";
import postgres from "postgres";

const BASE = process.env.CLONE_URL ?? "http://127.0.0.1:3311";
const OUT = process.env.CLONE_OUT ?? "/home/runner/workspace/replica/clone-screens";

// The viewport. The reference pictures of the original are 1024 wide, so
// the clone is shot at that width as well: the layout diff compares the
// two at the same scale, and a 1440-wide shot next to a 1024-wide one
// measures the difference in size, not the difference in layout.
const [width, height] = (process.env.CLONE_VIEWPORT ?? "1440x900").split("x").map(Number);
// Not DATABASE_URL: the shell this runs in may have one of its own, set to
// a different database entirely.
const DATABASE_URL =
  process.env.CLONE_DATABASE_URL ??
  process.env.E2E_DATABASE_URL ??
  "postgres://steadlink:steadlink@127.0.0.1:55440/steadlink_test";
const EXECUTABLE =
  process.env.CHROMIUM_PATH ??
  "/repl/tools/6bb0zvhm12wkbn4g2nix32cbran1mgb3-chromium/bin/chromium";
const STATE = process.env.CLONE_STATE ?? path.join(process.cwd(), "e2e", ".auth", "owner.json");

const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => undefined });

/**
 * The ids the screens need.
 *
 * The seed writes as the role that owns the tables, and the row level
 * security policies hide one workspace's rows from the next. So the
 * organization is read first, and every lookup after that runs inside a
 * scope for it. Without the scope the lookup finds nothing, and the screen
 * is shot of a route with a missing id in it.
 */
async function scopedOrgIds() {
  return sql.begin(async (tx) => {
    const orgs = await tx`select id from organization order by created_at limit 1`;
    if (!orgs[0]) throw new Error("the database has no workspace in it");
    await tx`select set_config('app.org_id', ${orgs[0].id}, true)`;
    return {
      link: await tx`select id from links where code = 'spring' limit 1`,
      qr: await tx`select id from qr_codes where code = 'menu' limit 1`,
      page: await tx`select id from pages where slug = 'betty' limit 1`,
      channel: await tx`select id from channels order by created_at limit 1`,
    };
  });
}

const found = await scopedOrgIds();
await sql.end();

const linkId = found.link[0]?.id;
const qrId = found.qr[0]?.id;
const pageId = found.page[0]?.id;
const channelId = found.channel[0]?.id;

/**
 * Screen id -> route. Every screen in the recon inventory that the clone
 * has a route for.
 *
 * `public: true` means the screen is seen by a person who is not signed in.
 * Everything else is shot with the session.
 *
 * `open` is what to click to reach the state the screen is really about —
 * a dialog, a panel, a step. The recon's screen is a state, not a URL.
 */
const SCREENS = {
  S01: { route: "/", name: "marketing home", public: true },
  S02: { route: "/sign-up", name: "sign up", public: true },
  S03: { route: "/sign-in", name: "log in", public: true },
  S04: { route: "/forgot-password", name: "forgot password", public: true },
  S07: { route: "/dashboard", name: "dashboard" },
  S08: { route: "/search?q=summer", name: "global search" },
  S10: { route: "/analytics?assistant=1", name: "assistant panel" },
  S11: { route: "/links", name: "links list" },
  S12: { route: "/links?new=1", name: "create link" },
  S13: { route: `/links/${linkId}`, name: "link detail" },
  S16: { route: "/settings/bulk", name: "bulk upload status" },
  S17: { route: "/qr", name: "qr codes list" },
  S18: { route: "/qr/new", name: "qr configure" },
  S19: {
    route: "/qr/new",
    name: "qr design customisation",
    // The designer is two steps: where it points, then how it looks. The
    // second step is the screen the recon describes.
    steps: [
      { fill: { label: /destination url/i, value: "https://acme.studio/spring" } },
      { click: { role: "button", name: /design your code/i } },
    ],
  },
  S20: { route: `/qr/${qrId}`, name: "qr detail" },
  S21: { route: "/qr/templates", name: "qr templates" },
  S24: { route: "/pages", name: "pages list" },
  S25: { route: "/pages?new=1", name: "page template picker" },
  S26: { route: `/pages/${pageId}`, name: "page builder" },
  S31: { route: `/pages/${pageId}`, name: "page numbers" },
  S33: { route: "/analytics", name: "analytics dashboard" },
  S35: {
    route: "/analytics",
    name: "top performing",
    // The panel is further down the page than the first screen shows.
    scroll: "Top performing links",
  },
  S36: { route: `/channels/${channelId}`, name: "channel details" },
  S39: { route: "/campaigns", name: "campaigns" },
  S40: { route: "/campaigns", name: "campaign create", open: { role: "button", name: /new campaign/i } },
  S42: { route: "/domains", name: "custom domains" },
  S43: { route: "/settings", name: "settings profile" },
  S44: { route: "/settings/usage", name: "billing and usage" },
  S45: { route: "/settings/users", name: "users and groups" },
  S46: { route: "/settings/sso", name: "sso" },
  S47: { route: "/settings/deeplinks", name: "mobile deep links" },
  S48: { route: "/settings/webhooks", name: "webhooks" },
  S49: { route: "/settings/api", name: "api tokens" },
  S50: { route: "/settings/activity", name: "activity log" },
  S52: { route: "/gone?reason=expired", name: "link state page", public: true },
  S30: { route: "/p/betty", name: "public page", public: true },
  // Not in the recon: the original has the expand API and no screen for
  // it. The clone has both.
  S53: { route: "/check?code=acme.go.arjav.is-cool.dev/spring", name: "link checker", public: true },
};

const requested = process.argv.slice(2);
const ids = requested.length ? requested : Object.keys(SCREENS);

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ["--no-sandbox"] });

const results = [];

for (const id of ids) {
  const screen = SCREENS[id];
  if (!screen) {
    results.push({ id, status: 0, route: "?", name: "unknown screen", errors: ["unknown screen"] });
    continue;
  }
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    ...(screen.public ? {} : { storageState: STATE }),
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  let status = 0;
  try {
    const response = await page.goto(`${BASE}${screen.route}`, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    status = response?.status() ?? 0;
    await page.waitForTimeout(700);

    for (const step of screen.steps ?? []) {
      if (step.fill) {
        await page
          .getByLabel(step.fill.label)
          .first()
          .fill(step.fill.value);
        await page.waitForTimeout(150);
      }
      if (step.click) {
        await page.getByRole(step.click.role, { name: step.click.name }).first().click();
        await page.waitForTimeout(500);
      }
    }

    if (screen.scroll) {
      await page.getByText(screen.scroll).first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
    }

    if (screen.open) {
      await page.getByRole(screen.open.role, { name: screen.open.name }).first().click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: path.join(OUT, `${id}.png`), fullPage: false });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `${id}-mobile.png`), fullPage: false });
  } catch (error) {
    errors.push(error.message);
  }

  results.push({ id, status, route: screen.route, name: screen.name, errors });
  await context.close();
}

await browser.close();

for (const result of results) {
  const status = result.status === 200 ? "ok  " : "FAIL";
  console.log(
    `${status} ${result.id} ${String(result.status).padEnd(4)} ${result.route.padEnd(38)} ${
      result.errors.length ? result.errors.join(" | ").slice(0, 90) : ""
    }`,
  );
}
const failed = results.filter((result) => result.status !== 200);
console.log(`\n${results.length - failed.length}/${results.length} screens returned 200`);
