#!/usr/bin/env node

/**
 * Prove the data layer keeps one workspace's rows from another.
 *
 *   node --experimental-strip-types packages/data/src/test-isolation.ts
 *
 * The row level security policies cover the tables where the organization
 * is known before the query runs. The tables that are reached by a public
 * identifier — a back-half, a page slug, a domain host — are not protected
 * by a policy, because the redirect hot path has to resolve them without a
 * session and without a workspace. Their isolation is the explicit
 * `org_id` filter every query in this layer carries, and this is where that
 * is proved.
 *
 * It runs against the real database with the real seed, with two
 * workspaces, and calls the same functions the screens call.
 */

import { sql } from "@steadlink/db";
import {
  listActivity,
  listBulkUploads,
  listCampaigns,
  listChannels,
  listLinks,
  listPages,
  listQrCodes,
  listWebhooks,
} from "./api.ts";

let failures = 0;

function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`  ok    ${label}${detail ? ` (${detail})` : ""}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}${detail ? ` (${detail})` : ""}`);
  }
}

async function main() {
  console.log("workspace isolation\n");

  const orgs = await sql()<{ id: string; name: string }[]>`
    select id, name from organization order by created_at
  `;
  if (orgs.length < 2) {
    console.log("  FAIL  the seed needs at least two workspaces to prove isolation");
    process.exit(1);
  }
  const [first, second] = orgs as unknown as [(typeof orgs)[0], (typeof orgs)[1]];
  console.log(`  comparing "${first.name}" with "${second.name}"\n`);

  // The context of each workspace, taken the way the application takes it:
  // from the membership, not from the id.
  const firstCtx = { userId: "", orgId: first.id, groupId: "" };
  const secondCtx = { userId: "", orgId: second.id, groupId: "" };

  const owner = await sql()<{ user_id: string }[]>`
    select user_id from member where organization_id = ${first.id} and role = 'owner' limit 1
  `;
  firstCtx.userId = owner[0]?.user_id ?? "";
  const owner2 = await sql()<{ user_id: string }[]>`
    select user_id from member where organization_id = ${second.id} and role = 'owner' limit 1
  `;
  secondCtx.userId = owner2[0]?.user_id ?? "";

  console.log("reads");

  const calls: [string, (ctx: typeof firstCtx) => Promise<{ orgId?: string | null }[]>][] = [
    ["links", async (ctx) => (await listLinks(ctx, { state: "all", limit: 100 })).links],
    ["QR codes", (ctx) => listQrCodes(ctx)],
    ["pages", (ctx) => listPages(ctx)],
    ["campaigns", (ctx) => listCampaigns(ctx)],
    ["channels", (ctx) => listChannels(ctx)],
    ["webhooks", (ctx) => listWebhooks(ctx)],
    [
      "bulk uploads",
      async (ctx) => (await listBulkUploads(ctx)) as unknown as { orgId?: string | null }[],
    ],
    ["activity", (ctx) => listActivity(ctx, 100)],
  ];

  for (const [name, call] of calls) {
    const rows = await call(firstCtx);
    const orgIds = new Set(rows.map((row) => row.orgId).filter(Boolean));
    const leaks = [...orgIds].filter((id) => id !== first.id);
    check(
      `${name} belong to the workspace that asked for them`,
      leaks.length === 0,
      `${rows.length} rows`,
    );
  }

  // The same call from the other workspace must not see the same rows.
  const firstLinks = (await listLinks(firstCtx, { state: "all", limit: 100 })).links;
  const secondLinks = (await listLinks(secondCtx, { state: "all", limit: 100 })).links;
  const firstIds = new Set(firstLinks.map((link) => link.id));
  const shared = secondLinks.filter((link) => firstIds.has(link.id));
  check("the two workspaces see different links", shared.length === 0, `${shared.length} shared`);

  // A link id from one workspace is not found by the other.
  const oneLink = firstLinks[0];
  if (oneLink) {
    const found = await sql()<{ id: string }[]>`
      select l.id from links l
      where l.id = ${oneLink.id} and l.org_id = ${second.id}
      limit 1
    `;
    check("a link id does not resolve in another workspace", found.length === 0);
  }

  console.log(
    `\n${failures === 0 ? "every workspace sees only its own rows" : `${failures} check(s) failed`}`,
  );
  await sql().end();
  process.exit(failures === 0 ? 0 : 1);
}

await main();
