/**
 * Seed the database with realistic fake data.
 *
 *   node --experimental-strip-types packages/db/src/seed.ts
 *
 * Two workspaces are created on purpose: the RLS test needs to prove that one
 * cannot see the other. No real people, no real addresses, no real domains.
 *
 * The seed writes every row in the database, across every organization, so
 * it runs as the role that owns them. The application role cannot: the row
 * level security policies are written for one organization at a time, and
 * the seed is not in one.
 */

// Set before the first query, not at import time: the client reads the
// environment when it is first used, not when it is imported.
if (process.env.DATABASE_MIGRATION_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_MIGRATION_URL;
}

import { db, sql } from "./client.ts";
import {
  activityLog,
  barcodes2d,
  bulkUploads,
  campaigns,
  channels,
  domains,
  engagementEvents,
  groups,
  linkDeeplinks,
  linkRoutingRules,
  links,
  linkTags,
  mailOutbox,
  member,
  organization,
  orgSettings,
  pageBlocks,
  pages,
  pageTemplates,
  plans,
  qrCodes,
  qrCodeTemplates,
  reservedCodes,
  tags,
  user,
  utmPresets,
  webhookDeliveries,
  webhooks,
} from "./schema.ts";

/* A deterministic PRNG, so the seed is the same on every run. */
let state = 20261020;
function rand(): number {
  state = (state * 1103515245 + 12345) & 0x7fffffff;
  return state / 0x7fffffff;
}

/**
 * A deterministic identifier.
 *
 * The seed has to be the same on every run, and a random uuid is not: the
 * rows would get new identifiers each time, and anything that referred to
 * them — a session, a page, a test — would stop referring to them. So the
 * identifiers come out of the same generator as everything else.
 */
function id(): string {
  const bytes = Buffer.alloc(16);
  for (let index = 0; index < 16; index += 1) {
    bytes[index] = Math.floor(rand() * 256);
  }
  // The version and the variant, so it looks like a uuid and sorts well.
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]!;
}
function int(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}
function weighted<T extends { weight: number }>(items: readonly T[]): T {
  let roll = rand() * items.reduce((sum, item) => sum + item.weight, 0);
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1]!;
}

const NOW = Date.UTC(2026, 9, 20, 12, 0, 0);
const DAY = 86_400_000;

function daysAgo(days: number, hour = 10): Date {
  // Always in the past: hour 0 is a day ago, hour 23 is an hour ago.
  return new Date(NOW - days * DAY - (24 - hour) * 3_600_000);
}

const COUNTRIES = [
  { code: "US", city: "New York", region: "New York", weight: 30 },
  { code: "US", city: "San Francisco", region: "California", weight: 18 },
  { code: "GB", city: "London", region: "England", weight: 12 },
  { code: "DE", city: "Berlin", region: "Berlin", weight: 9 },
  { code: "CA", city: "Toronto", region: "Ontario", weight: 8 },
  { code: "IN", city: "Mumbai", region: "Maharashtra", weight: 7 },
  { code: "AU", city: "Sydney", region: "New South Wales", weight: 6 },
  { code: "FR", city: "Paris", region: "Ile-de-France", weight: 5 },
  { code: "BR", city: "Sao Paulo", region: "Sao Paulo", weight: 5 },
];

const DEVICES = [
  { type: "Desktop", os: "Windows", browser: "Chrome", weight: 34 },
  { type: "Mobile phone", os: "iOS", browser: "Safari", weight: 28 },
  { type: "Mobile phone", os: "Android", browser: "Chrome", weight: 16 },
  { type: "Desktop", os: "macOS", browser: "Safari", weight: 12 },
  { type: "Tablet", os: "iPadOS", browser: "Safari", weight: 6 },
  { type: "Ebook reader", os: "Android", browser: "Kindle", weight: 2 },
  { type: "TV device", os: "Roku", browser: "Roku", weight: 2 },
];

const REFERRERS = [
  { name: "direct", domain: null, weight: 34 },
  { name: "Facebook", domain: "facebook.com", weight: 16 },
  { name: "Google", domain: "google.com", weight: 14 },
  { name: "Instagram", domain: "instagram.com", weight: 11 },
  { name: "X", domain: "x.com", weight: 8 },
  { name: "LinkedIn", domain: "linkedin.com", weight: 6 },
  { name: "newsletter", domain: "buttondown.email", weight: 6 },
  { name: "Reddit", domain: "reddit.com", weight: 5 },
];

const AGENTS = ["ClaudeBot", "GPTBot", "PerplexityBot", "Google-Extended"];

async function main() {
  const database = db();
  const client = sql();

  console.log("clearing existing rows");
  await client.unsafe(`
    truncate table
      engagement_events, engagement_rollups, link_tags, link_routing_rules,
      link_deeplinks, page_blocks, qr_codes, qr_code_templates, barcodes_2d,
      links, tags, pages, campaigns, channels, utm_presets, webhook_deliveries,
      webhooks, bulk_uploads, activity_log, member, invitation,
      "apikey", "account", "verification", "session", "user", org_settings,
      groups, domains, reserved_codes, page_templates, plans, organization,
      deleted_accounts, mail_outbox, ai_settings
    restart identity cascade
  `);

  /* ---- shared tables -------------------------------------------------- */

  await database
    .insert(plans)
    .values({
      id: id(),
      code: "community",
      name: "Community",
      limits: {
        links: 1000,
        qrCodes: 50,
        pages: 20,
        backHalves: 100,
        customDomains: 5,
      },
      features: {
        dynamicRouting: true,
        customDomains: true,
        webhooks: true,
        pages: true,
        sso: false,
      },
    })
    .onConflictDoNothing();

  // The migration puts the same plan in, so the seed may have found it
  // already there. The workspace points at whichever row is really there.
  const planRows = await sql()<{ id: string }[]>`
    select id from plans where code = 'community' limit 1
  `;
  const planId = planRows[0]!.id;

  const reserved = [
    "p",
    "app",
    "api",
    "links",
    "link",
    "qr",
    "qrcodes",
    "pages",
    "page",
    "analytics",
    "campaigns",
    "channels",
    "domains",
    "webhooks",
    "settings",
    "login",
    "logout",
    "signup",
    "signin",
    "register",
    "auth",
    "me",
    "account",
    "profile",
    "admin",
    "billing",
    "notifications",
    "activity",
    "bulk",
    "uploads",
    "export",
    "import",
    "share",
    "new",
    "create",
    "edit",
    "help",
    "docs",
    "blog",
    "pricing",
    "about",
    "terms",
    "privacy",
    "status",
    "healthz",
    "readyz",
    "assets",
    "static",
    "public",
    "_next",
    "favicon.ico",
    "robots.txt",
    "sitemap.xml",
    "search",
    "design",
    "dashboard",
    "gone",
    "sign-in",
    "sign-up",
    "forgot-password",
    "reset-password",
    "icon.svg",
  ];
  await database
    .insert(reservedCodes)
    .values(reserved.map((code) => ({ code, reason: "app route" })));

  await database.insert(pageTemplates).values([
    {
      id: id(),
      slug: "link-in-bio",
      name: "Link in bio",
      category: "Personal",
      content: {
        blocks: [
          { type: "text", config: { heading: "Your name", body: "A short line about you." } },
          { type: "link", config: { title: "A link" } },
          { type: "link", config: { title: "Another link" } },
        ],
      },
      isOfficial: true,
    },
    {
      id: id(),
      slug: "store",
      name: "Store",
      category: "Business",
      content: {
        blocks: [
          { type: "text", config: { heading: "Shop", body: "Our current collection." } },
          { type: "grid", config: { items: ["Product one", "Product two"] } },
        ],
      },
      isOfficial: true,
    },
    {
      id: id(),
      slug: "event",
      name: "Event",
      category: "Events",
      content: {
        blocks: [
          { type: "text", config: { heading: "Event name", body: "When and where." } },
          { type: "button", config: { title: "Register" } },
        ],
      },
      isOfficial: true,
    },
    {
      id: id(),
      slug: "business-card",
      name: "Business card",
      category: "Personal",
      content: {
        blocks: [{ type: "business_card", config: { name: "Your name", title: "Your role" } }],
      },
      isOfficial: true,
    },
  ]);

  /* ---- the deployment base domain ------------------------------------ */

  // Each workspace gets its own subdomain of the base. A single shared
  // default domain would make back-halves collide between workspaces,
  // because the unique key is (domain, code).
  const baseDomain = process.env.DEFAULT_SHORT_DOMAIN ?? "go.arjav.is-cool.dev";

  /* ---- two workspaces ------------------------------------------------- */

  const workspaces = [
    {
      org: {
        id: id(),
        name: "Acme Studio",
        slug: "acme",
        timezone: "Europe/Berlin",
      },
      users: [
        { email: "arjav@example.com", name: "Arjav", role: "owner" },
        { email: "mira@example.com", name: "Mira Okonkwo", role: "member" },
      ],
      customDomain: { host: "acme.studio", verified: false },
    },
    {
      // A second workspace, so the RLS test has something to hide behind.
      org: {
        id: id(),
        name: "Northwind Coffee",
        slug: "northwind",
        timezone: "America/Chicago",
      },
      users: [{ email: "sam@example.com", name: "Sam Iverson", role: "owner" }],
      customDomain: { host: "northwind.coffee", verified: true },
    },
  ];

  for (const workspace of workspaces) {
    const orgId = workspace.org.id;

    await database.insert(organization).values({
      id: orgId,
      name: workspace.org.name,
      slug: workspace.org.slug,
      metadata: {},
      createdAt: daysAgo(220),
    });
    await database.insert(orgSettings).values({
      orgId,
      planId,
      timezone: workspace.org.timezone,
      isPersonal: false,
    });

    const userIds: string[] = [];
    for (const account of workspace.users) {
      const userId = id();
      userIds.push(userId);
      await database.insert(user).values({
        id: userId,
        name: account.name,
        email: account.email,
        emailVerified: true,
        createdAt: daysAgo(220),
        updatedAt: daysAgo(1),
      });
      await database.insert(member).values({
        id: id(),
        organizationId: orgId,
        userId,
        role: account.role,
        createdAt: daysAgo(220),
      });
    }

    const defaultGroupId = id();
    const campaignGroupId = id();
    await database.insert(groups).values([
      {
        id: defaultGroupId,
        orgId,
        name: "All links",
        slug: "all-links",
        isDefault: true,
        createdAt: daysAgo(220),
      },
      {
        id: campaignGroupId,
        orgId,
        name: "Campaigns",
        slug: "campaigns",
        isDefault: false,
        createdAt: daysAgo(220),
      },
    ]);

    const defaultDomainId = id();
    await database.insert(domains).values({
      id: defaultDomainId,
      orgId,
      host: `${workspace.org.slug}.${baseDomain}`,
      kind: "default",
      verificationStatus: "verified",
      verifiedAt: daysAgo(220),
    });

    const customDomainId = id();
    await database.insert(domains).values({
      id: customDomainId,
      orgId,
      host: workspace.customDomain.host,
      kind: "custom",
      verificationStatus: workspace.customDomain.verified ? "verified" : "pending",
      verifiedAt: workspace.customDomain.verified ? daysAgo(40) : null,
      dnsRecords: [
        { type: "CNAME", name: "go", value: "proxy.golink.dev" },
        { type: "TXT", name: "_golink", value: `golink-verify=${id().slice(0, 8)}` },
      ],
      createdAt: daysAgo(60),
    });

    /* campaigns and channels */
    const campaignIds: string[] = [];
    for (const name of ["Spring launch", "April newsletter"]) {
      const campaignId = id();
      campaignIds.push(campaignId);
      await database.insert(campaigns).values({
        id: campaignId,
        orgId,
        groupId: campaignGroupId,
        name,
        createdBy: userIds[0]!,
        createdAt: daysAgo(60),
        updatedAt: daysAgo(60),
      });
      for (const channel of ["social", "email", "paid"]) {
        await database.insert(channels).values({
          id: id(),
          orgId,
          campaignId,
          name: channel,
          createdAt: daysAgo(60),
          updatedAt: daysAgo(60),
        });
      }
    }

    await database.insert(utmPresets).values({
      id: id(),
      orgId,
      name: "Spring launch",
      params: { utm_source: "social", utm_medium: "golink", utm_campaign: "spring-launch" },
    });

    /* links */
    const linkSeeds: {
      code: string;
      longUrl: string;
      title: string;
      tags: string[];
      age: number;
      state?: "hidden" | "archived";
      expiresInDays?: number;
      clicks: number;
    }[] = [
      {
        code: "spring",
        longUrl: "https://example.com/collections/spring",
        title: "Spring collection",
        tags: ["launch", "spring"],
        age: 40,
        clicks: 268,
      },
      {
        code: "launch",
        longUrl: "https://example.com/blog/checkout",
        title: "Why we rewrote checkout",
        tags: ["blog"],
        age: 34,
        clicks: 191,
      },
      {
        code: "summer",
        longUrl: "https://example.com/collections/summer",
        title: "Summer lookbook",
        tags: ["lookbook"],
        age: 28,
        clicks: 143,
      },
      {
        code: "menu",
        longUrl: "https://example.com/pages/menu",
        title: "Cafe menu",
        tags: ["venue"],
        age: 22,
        clicks: 86,
      },
      {
        code: "newsletter",
        longUrl: "https://example.com/posts/april",
        title: "April newsletter",
        tags: ["newsletter"],
        age: 18,
        clicks: 118,
      },
      {
        code: "podcast",
        longUrl: "https://example.com/podcast/14",
        title: "Episode 14",
        tags: ["podcast"],
        age: 14,
        clicks: 64,
      },
      {
        code: "signup",
        longUrl: "https://example.com/join",
        title: "Join the list",
        tags: ["acquisition"],
        age: 11,
        clicks: 52,
      },
      {
        code: "print-ad",
        longUrl: "https://example.com/print/spring",
        title: "Spring flyer (print)",
        tags: ["print"],
        age: 9,
        state: "hidden",
        clicks: 57,
      },
      {
        code: "showroom",
        longUrl: "https://example.com/showroom",
        title: "Showroom",
        tags: ["venue"],
        age: 7,
        clicks: 41,
      },
      {
        code: "giveaway",
        longUrl: "https://example.com/giveaway",
        title: "Giveaway",
        tags: ["promo"],
        age: 6,
        expiresInDays: -2,
        clicks: 0,
      },
      {
        code: "old-promo",
        longUrl: "https://example.com/promo/2025",
        title: "Winter promo (ended)",
        tags: ["promo"],
        age: 180,
        state: "archived",
        clicks: 22,
      },
      {
        code: "lookbook",
        longUrl: "https://example.com/lookbook/2026",
        title: "Lookbook 2026",
        tags: ["lookbook"],
        age: 4,
        clicks: 27,
      },
      {
        code: "workshop",
        longUrl: "https://example.com/workshops",
        title: "Embroidery workshop",
        tags: ["events"],
        age: 3,
        expiresInDays: 21,
        clicks: 0,
      },
      {
        code: "careers",
        longUrl: "https://example.com/careers",
        title: "We are hiring",
        tags: ["careers"],
        age: 2,
        clicks: 19,
      },
    ];

    const linkIds: string[] = [];
    for (const seedLink of linkSeeds) {
      const linkId = id();
      linkIds.push(linkId);
      await database.insert(links).values({
        id: linkId,
        orgId,
        groupId: defaultGroupId,
        domainId: defaultDomainId,
        code: seedLink.code,
        longUrl: seedLink.longUrl,
        title: seedLink.title,
        version: 1,
        tags: seedLink.tags,
        archivedAt: seedLink.state === "archived" ? daysAgo(120) : null,
        hiddenAt: seedLink.state === "hidden" ? daysAgo(5) : null,
        expiresAt:
          seedLink.expiresInDays === undefined
            ? null
            : seedLink.expiresInDays < 0
              ? daysAgo(2)
              : new Date(NOW + seedLink.expiresInDays * DAY),
        clickCount: seedLink.clicks,
        createdBy: userIds[0]!,
        createdAt: daysAgo(seedLink.age),
        updatedAt: daysAgo(Math.max(0, seedLink.age - 2)),
      });
    }

    /* tags */
    const tagIds = new Map<string, string>();
    for (const name of [
      "launch",
      "spring",
      "blog",
      "lookbook",
      "venue",
      "newsletter",
      "podcast",
      "acquisition",
      "print",
      "promo",
      "events",
      "careers",
    ]) {
      const tagId = id();
      tagIds.set(name, tagId);
      await database.insert(tags).values({ id: tagId, orgId, name, createdAt: daysAgo(200) });
    }
    for (const seedLink of linkSeeds) {
      const linkId = linkIds[linkSeeds.indexOf(seedLink)]!;
      for (const tag of seedLink.tags) {
        const tagId = tagIds.get(tag);
        if (tagId) {
          await database.insert(linkTags).values({ linkId, tagId });
        }
      }
    }

    /* a routing rule and a deep link */
    const summerId = linkIds[linkSeeds.findIndex((l) => l.code === "summer")]!;
    await database.insert(linkRoutingRules).values([
      {
        id: id(),
        linkId: summerId,
        position: 0,
        longUrl: "https://example.com/collections/summer?region=eu",
        countryMatch: ["DE", "AT", "CH"],
      },
      {
        id: id(),
        linkId: summerId,
        position: 1,
        longUrl: "https://example.com/collections/summer?mobile=1",
        deviceMatch: ["mobile", "tablet"],
      },
    ]);
    await database.insert(linkDeeplinks).values({
      id: id(),
      linkId: summerId,
      appUriPath: "/products/lookbook",
      installUrl: "https://example.com/app",
      os: "ios",
      installType: "promote_install",
    });

    /* QR codes */
    const qrIds: string[] = [];
    const qrSeeds = [
      {
        code: "menu",
        title: "Cafe menu",
        link: "menu",
        pattern: "rounded",
        color: "#272d36",
        scans: 96,
      },
      {
        code: "showroom",
        title: "Showroom window",
        link: "showroom",
        pattern: "circle",
        color: "#2f3a4a",
        scans: 41,
      },
      {
        code: "stickers",
        title: "Product stickers",
        link: null,
        pattern: "block",
        color: "#b3261e",
        scans: 18,
      },
      {
        code: "winter",
        title: "Winter promo (ended)",
        link: null,
        pattern: "standard",
        color: "#5b6470",
        scans: 4,
      },
    ];
    for (const qr of qrSeeds) {
      const qrId = id();
      qrIds.push(qrId);
      await database.insert(qrCodes).values({
        id: qrId,
        orgId,
        groupId: defaultGroupId,
        linkId: qr.link ? linkIds[linkSeeds.findIndex((l) => l.code === qr.link)]! : null,
        domainId: defaultDomainId,
        code: qr.code,
        longUrl: `https://example.com/${qr.code}`,
        title: qr.title,
        design: { dotPattern: qr.pattern, backgroundColor: "#ffffff", dotPatternColor: qr.color },
        tags: ["print"],
        expiresAt: qr.code === "winter" ? daysAgo(30) : null,
        scanCount: qr.scans,
        createdBy: userIds[0]!,
        createdAt: daysAgo(20),
        updatedAt: daysAgo(20),
      });
    }

    for (const [name, design] of [
      [
        "Product",
        { dotPattern: "rounded", backgroundColor: "#ffffff", dotPatternColor: "#272d36" },
      ],
      ["Event", { dotPattern: "circle", backgroundColor: "#ffffff", dotPatternColor: "#4c5bd4" }],
      [
        "Packaging",
        { dotPattern: "block", backgroundColor: "#ffffff", dotPatternColor: "#0f766e" },
      ],
    ] as const) {
      await database.insert(qrCodeTemplates).values({
        id: id(),
        orgId,
        name,
        design,
        createdBy: userIds[0]!,
        createdAt: daysAgo(60),
        updatedAt: daysAgo(60),
      });
    }

    await database.insert(barcodes2d).values({
      id: id(),
      orgId,
      groupId: defaultGroupId,
      symbology: "gs1_128",
      gtin: "4006381333931",
      payload: "(01)04006381333931",
      createdBy: userIds[0]!,
      createdAt: daysAgo(10),
    });

    /* pages */
    const pageIds: string[] = [];
    const pageSeeds = [
      { title: "Betty Baker", slug: "betty", status: "published" as const, age: 30 },
      { title: "Acme Studio", slug: "studio", status: "draft" as const, age: 5 },
      { title: "Embroidery workshop", slug: "workshop", status: "scheduled" as const, age: 2 },
    ];
    for (const page of pageSeeds) {
      const pageId = id();
      pageIds.push(pageId);
      await database.insert(pages).values({
        id: pageId,
        orgId,
        groupId: defaultGroupId,
        domainId: page.slug === "studio" ? customDomainId : null,
        title: page.title,
        slug: page.slug,
        status: page.status,
        appearance: { theme: "plain", font: "sans", background: "#ffffff" },
        scheduledFor: page.status === "scheduled" ? new Date(NOW + 3 * DAY) : null,
        publishedAt: page.status === "published" ? daysAgo(25) : null,
        createdBy: userIds[0]!,
        createdAt: daysAgo(page.age),
        updatedAt: daysAgo(Math.max(0, page.age - 1)),
      });
    }

    const blockSeeds = [
      {
        page: 0,
        type: "text" as const,
        config: { heading: "Betty Baker", body: "Baking recipes for cakes, cookies and dessert." },
      },
      {
        page: 0,
        type: "grid" as const,
        config: { items: ["Chocolate Mix Cake", "Cherry Top Cup", "Unicorn Strawberries"] },
      },
      {
        page: 0,
        type: "link" as const,
        config: { title: "Order a box", subtitle: "Ships on Fridays" },
        url: "https://example.com/order",
      },
      {
        page: 1,
        type: "text" as const,
        config: { heading: "Acme Studio", body: "Objects, textiles and small things." },
      },
      {
        page: 2,
        type: "text" as const,
        config: {
          heading: "Embroidery workshop",
          body: "One afternoon, four hours, a hoop and a needle.",
        },
      },
    ];
    const positions = new Map<number, number>();
    for (const block of blockSeeds) {
      const position = positions.get(block.page) ?? 0;
      positions.set(block.page, position + 1);
      await database.insert(pageBlocks).values({
        id: id(),
        pageId: pageIds[block.page]!,
        position,
        type: block.type,
        config: block.config,
        url: "url" in block ? (block.url ?? null) : null,
        createdAt: daysAgo(20),
        updatedAt: daysAgo(20),
      });
    }

    /* engagement */
    const events: (typeof engagementEvents.$inferInsert)[] = [];
    for (const seedLink of linkSeeds) {
      if (seedLink.clicks === 0) continue;
      const linkId = linkIds[linkSeeds.indexOf(seedLink)]!;
      for (let i = 0; i < seedLink.clicks; i += 1) {
        const country = weighted(COUNTRIES);
        const device = weighted(DEVICES);
        const referrer = weighted(REFERRERS);
        events.push({
          orgId,
          groupId: defaultGroupId,
          linkId,
          eventType: "click",
          occurredAt: daysAgo(int(0, 29), int(0, 23)),
          countryCode: country.code,
          city: country.city,
          region: country.region,
          deviceType: device.type,
          os: device.os,
          browser: device.browser,
          referrer: referrer.name,
          referrerDomain: referrer.domain,
          userAgent: `${device.browser} on ${device.os}`,
          agentName: rand() < 0.04 ? pick(AGENTS) : null,
        });
      }
    }
    for (let i = 0; i < 180; i += 1) {
      const country = weighted(COUNTRIES);
      const device = weighted(DEVICES);
      events.push({
        orgId,
        groupId: defaultGroupId,
        pageId: pick(pageIds)!,
        eventType: "page_view",
        occurredAt: daysAgo(int(0, 29), int(0, 23)),
        countryCode: country.code,
        city: country.city,
        region: country.region,
        deviceType: device.type,
        os: device.os,
        browser: device.browser,
        referrer: "direct",
        userAgent: `${device.browser} on ${device.os}`,
      });
    }
    for (const qr of qrSeeds) {
      const qrId = qrIds[qrSeeds.indexOf(qr)]!;
      for (let i = 0; i < qr.scans; i += 1) {
        const country = weighted(COUNTRIES);
        const device = weighted(DEVICES);
        events.push({
          orgId,
          groupId: defaultGroupId,
          qrCodeId: qrId,
          eventType: "scan",
          occurredAt: daysAgo(int(0, 29), int(0, 23)),
          countryCode: country.code,
          city: country.city,
          region: country.region,
          deviceType: device.type,
          os: device.os,
          browser: device.browser,
          referrer: "direct",
          userAgent: `${device.browser} on ${device.os}`,
        });
      }
    }
    // The log is the biggest table in the product, so it is written in one go.
    console.log(`writing ${events.length} engagement events`);
    for (let i = 0; i < events.length; i += 500) {
      await database.insert(engagementEvents).values(events.slice(i, i + 500));
    }

    /* platform */
    const webhookIds: string[] = [];
    for (const hook of [
      {
        name: "Engagement stream",
        event: "engagement",
        url: "https://hooks.example.com/golink/engagement",
        active: true,
        tags: true,
      },
      {
        name: "New links",
        event: "link.created",
        url: "https://hooks.example.com/golink/links",
        active: false,
        tags: false,
      },
    ]) {
      const webhookId = id();
      webhookIds.push(webhookId);
      await database.insert(webhooks).values({
        id: webhookId,
        orgId,
        name: hook.name,
        event: hook.event,
        url: hook.url,
        secret: `whsec_${id().replace(/-/g, "").slice(0, 12)}`,
        authType: "hmac",
        isActive: hook.active,
        fetchTags: hook.tags,
        lastStatus: hook.active ? 200 : null,
        lastDeliveredAt: hook.active ? daysAgo(0, 11) : null,
        createdAt: daysAgo(80),
        updatedAt: daysAgo(80),
      });
    }
    await database.insert(webhookDeliveries).values({
      id: id(),
      webhookId: webhookIds[0]!,
      eventId: id(),
      eventType: "engagement",
      payload: {
        event_id: "seed",
        event_type: "engagement",
        bitlink: "go.arjav.is-cool.dev/spring",
        country: "DE",
        device_type: "Desktop",
      },
      status: "delivered",
      attempt: 1,
      responseStatus: 200,
      createdAt: daysAgo(0, 11),
      deliveredAt: daysAgo(0, 11),
    });

    await database.insert(bulkUploads).values([
      {
        id: id(),
        orgId,
        groupId: defaultGroupId,
        filename: "spring-catalog.csv",
        status: "completed",
        rowCount: 48,
        successCount: 46,
        errorCount: 2,
        errors: [
          {
            row: 12,
            code: "DUPLICATE_CODE",
            message: "That back-half is already taken on this domain.",
          },
          { row: 31, code: "INVALID_URL", message: "The destination could not be parsed." },
        ],
        createdBy: userIds[0]!,
        createdAt: daysAgo(38),
        completedAt: daysAgo(38),
      },
      {
        id: id(),
        orgId,
        groupId: defaultGroupId,
        filename: "print-run-2027.csv",
        status: "processing",
        rowCount: 120,
        successCount: 74,
        errorCount: 0,
        errors: [],
        createdBy: userIds[0]!,
        createdAt: daysAgo(0, 9),
        completedAt: null,
      },
    ]);

    await database.insert(activityLog).values([
      {
        orgId,
        userId: userIds[0]!,
        action: "link.created",
        targetType: "link",
        targetId: linkIds[0]!,
        metadata: { code: "spring" },
        createdAt: daysAgo(40),
      },
      {
        orgId,
        userId: userIds[0]!,
        action: "domain.added",
        targetType: "domain",
        targetId: customDomainId,
        metadata: { host: workspace.customDomain.host },
        createdAt: daysAgo(9),
      },
      {
        orgId,
        userId: userIds[0]!,
        action: "page.published",
        targetType: "page",
        targetId: pageIds[0]!,
        metadata: { slug: "betty" },
        createdAt: daysAgo(25),
      },
    ]);

    await database.insert(mailOutbox).values({
      id: id(),
      to: workspace.users[0]!.email,
      subject: "Your GoLink workspace is ready",
      html: "<p>Your workspace has been created. Open it to start shortening links.</p>",
      kind: "workspace_created",
      status: "sent",
      sentAt: daysAgo(220),
    });

    console.log(
      `seeded ${workspace.org.name}: ${linkSeeds.length} links, ${qrSeeds.length} codes, ${pageSeeds.length} pages`,
    );
  }

  console.log("done");
  await client.end();
}

await main();
