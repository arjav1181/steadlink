#!/usr/bin/env node
/**
 * Prove the access rules.
 *
 * The skill's rule: "authorisation checked on every read and write, tested
 * with a second user". This does exactly that, against the real database
 * with the real row level security policies.
 *
 *   node --experimental-strip-types packages/db/src/test-rls.ts
 *
 * It runs as `steadlink_app`, the role the application connects as, so the
 * policies apply. The superuser would bypass them all, which would make the
 * test meaningless.
 *
 * The tables here are the ones the policies still cover: the tables that
 * hold one workspace's private material. The tables that are reached by a
 * public identifier — a back-half, a page slug, a domain host — are not
 * under the policies, because the redirect hot path resolves them without a
 * session and without a workspace. Their isolation is the `org_id` filter
 * every query in the data layer carries, and
 * packages/data/src/test-isolation.ts proves that.
 */

import postgres from "postgres";

import { sql } from "./client.ts";

const client = sql();

let failures = 0;

function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`  ok    ${label}${detail ? ` (${detail})` : ""}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}${detail ? ` (${detail})` : ""}`);
  }
}

/** Run a count inside a scoped transaction as the application role. */
async function countInScope(orgId: string | null, sqlText: string): Promise<number> {
  return client.begin(async (tx) => {
    // The application role, so the policies apply.
    await tx.unsafe("set local role steadlink_app");
    if (orgId === null) {
      await tx.unsafe("select set_config('app.org_id', '', true)");
    } else {
      await tx`select set_config('app.org_id', ${orgId}, true)`;
    }
    const rows = await tx.unsafe(sqlText);
    return Number(rows[0]?.count ?? 0);
  });
}

/**
 * The tables the policies cover.
 *
 * Every one of them holds one workspace's private material, and every one
 * of them carries an `org_id`.
 */
const PROTECTED = [
  "org_settings",
  "organization_counters",
  "tags",
  "campaigns",
  "channels",
  "utm_presets",
  "webhooks",
  "bulk_uploads",
  "activity_log",
  "ai_settings",
  "qr_code_templates",
] as const;

async function main() {
  console.log("access rules\n");

  // Two workspaces, so there is something to hide.
  const orgs = await client<{ id: string; name: string }[]>`
    select id, name from organization order by created_at
  `;
  if (orgs.length < 2) {
    console.log("  FAIL  the seed needs at least two workspaces to prove isolation");
    process.exit(1);
  }
  const [first, second] = orgs as unknown as [(typeof orgs)[0], (typeof orgs)[1]];
  console.log(`  comparing "${first.name}" with "${second.name}"\n`);

  console.log("reads");

  for (const table of PROTECTED) {
    const own = await countInScope(first.id, `select count(*) from ${table}`);
    const unscoped = await countInScope(null, `select count(*) from ${table}`);
    check(
      `${table} is scoped to its own workspace`,
      unscoped === 0,
      `${own} rows, ${unscoped} without a scope`,
    );

    // The other workspace's rows are not visible from this scope. Counting
    // every row in the other scope would count that workspace's own rows,
    // which is not a leak.
    const leaked = await countInScope(
      first.id,
      `select count(*) from ${table} where org_id = '${second.id}'`,
    );
    check(`${table} does not leak into another workspace`, leaked === 0, `${leaked} rows`);
  }

  console.log("\nwrites");

  // The write test runs on its own connection in autocommit. A statement
  // that the policy rejects fails on its own, without poisoning the session
  // for the next one.
  async function writeAsApp(
    scopeOrgId: string,
    targetOrgId: string,
    name: string,
  ): Promise<string> {
    const conn = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
    try {
      await conn.unsafe("set role steadlink_app");
      await conn.unsafe(`select set_config('app.org_id', '${scopeOrgId}', false)`);
      await conn`
        insert into campaigns (org_id, group_id, name, created_by)
        values (
          ${targetOrgId},
          (select id from groups where org_id = ${targetOrgId} limit 1),
          ${name},
          (select user_id from member where organization_id = ${scopeOrgId} limit 1)
        )
      `;
      return "inserted";
    } catch (error) {
      return (error as Error).message;
    } finally {
      await conn.end();
    }
  }

  const ownWrite = await writeAsApp(second.id, second.id, "own-write-test");
  check("a row can be written into its own workspace", ownWrite === "inserted", String(ownWrite));

  // Scoped as the second workspace, but claiming the first one.
  const crossWrite = await writeAsApp(second.id, first.id, "cross-write-test");
  check(
    "a row cannot be written into another workspace",
    crossWrite !== "inserted",
    crossWrite === "inserted" ? "the insert was allowed" : "the policy rejected it",
  );

  // Scoped as the first workspace, but claiming the second one.
  const crossOrg = await writeAsApp(first.id, second.id, "cross-org-test");
  check(
    "a row cannot claim another workspaces organization",
    crossOrg !== "inserted",
    crossOrg === "inserted" ? "the insert was allowed" : "the policy rejected it",
  );

  // Clean up the rows the tests wrote.
  await client`delete from campaigns where name in ('own-write-test', 'cross-write-test', 'cross-org-test')`;

  console.log(failures === 0 ? "\nall access rules hold" : `\n${failures} access rule(s) failed`);
  await client.end();
  process.exit(failures === 0 ? 0 : 1);
}

await main();
