#!/usr/bin/env node
/**
 * Apply the migrations.
 *
 *   node --experimental-strip-types packages/db/src/migrate.ts
 *
 * Drizzle's own postgres-js migrator batches statements in a way that breaks
 * on DO blocks and on comments, so this reads the same journal and the same
 * SQL files and runs them one statement at a time. The output is identical:
 * `drizzle-kit generate` still produces the files, and the ledger table is
 * still the one drizzle expects.
 *
 * Each migration runs in one transaction. A migration that fails leaves the
 * database exactly as it was.
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "./client.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(here, "..", "migrations");

// The migrations need a role that can create tables. The application does
// not, and must not: it connects as an unprivileged role so the row level
// security policies apply to it.
//
// This has to be the connection the migrations actually use. Reading the
// variable and then connecting with `DATABASE_URL` would run the
// migrations as the application, and in the container deployment that
// fails with "permission denied for schema public".
const url = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const client = createClient(url);

interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

const journal = JSON.parse(
  readFileSync(path.join(migrationsFolder, "meta", "_journal.json"), "utf-8"),
) as { entries: JournalEntry[] };

// The roles the RLS policies refer to. CREATE ROLE cannot be conditional in
// plain SQL, and a DO block cannot be sent through this client, so the check
// and the create happen here.
for (const role of ["steadlink_app", "steadlink_worker"]) {
  const exists = await client<{ rolname: string }[]>`
    select rolname from pg_roles where rolname = ${role}
  `;
  if (exists.length === 0) {
    console.log(`creating role ${role}`);
    await client.unsafe(
      role === "steadlink_worker"
        ? "create role steadlink_worker nologin bypassrls"
        : "create role steadlink_app nologin",
    );
  }
}

// One statement per call. postgres.js refuses to send more than one
// command in a single extended-protocol message.
await client`create schema if not exists drizzle`;
await client`
  create table if not exists drizzle.__drizzle_migrations (
    id serial primary key,
    hash text not null,
    created_at bigint
  )
`;

const applied = await client<{ hash: string; created_at: string }[]>`
  select hash, created_at from drizzle.__drizzle_migrations order by created_at desc
`;
const appliedHashes = new Set(applied.map((row) => row.hash));

let ran = 0;
let skipped = 0;

for (const entry of journal.entries) {
  const file = path.join(migrationsFolder, `${entry.tag}.sql`);
  if (!readdirSync(migrationsFolder).includes(`${entry.tag}.sql`)) {
    console.error(`missing migration file: ${entry.tag}.sql`);
    process.exit(1);
  }
  const query = readFileSync(file, "utf-8");
  const hash = createHash("sha256").update(query).digest("hex");

  if (appliedHashes.has(hash)) {
    skipped += 1;
    continue;
  }

  const statements = query
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  console.log(`applying ${entry.tag} (${statements.length} statements)`);

  await client.begin(async (tx) => {
    for (const statement of statements) {
      await tx.unsafe(statement);
    }
    await tx`
      insert into drizzle.__drizzle_migrations (hash, created_at)
      values (${hash}, ${entry.when})
    `;
  });

  ran += 1;
}

console.log(`migrations applied: ${ran} run, ${skipped} already applied`);

// The RLS migration creates the roles. Grant them to the login roles the
// operator configured, so the app can actually set the scope.
//
// The two roles are separate on purpose. Membership of a role with
// BYPASSRLS is inherited, so a role that holds both steadlink_app and
// steadlink_worker would bypass every policy.
const appRole = process.env.DATABASE_APP_ROLE;
const workerRole = process.env.DATABASE_WORKER_ROLE;

const grant = async (role: string, group: string) => {
  await client.unsafe(`
    do $$
    begin
      if exists (select 1 from pg_roles where rolname = '${group}')
         and not exists (
           select 1 from pg_roles where rolname = '${role}' and rolsuper
         ) then
        execute format('grant %I to %I', '${group}', '${role}');
      end if;
    end
    $$;
  `);
  console.log(`granted ${group} to ${role}`);
};

if (appRole) await grant(appRole, "steadlink_app");
if (workerRole) await grant(workerRole, "steadlink_worker");

// The privileges on the tables, repeated after every run.
//
// A grant on "all tables in schema public" covers the tables that exist
// when it runs. A migration that creates a table afterwards leaves that
// table without any privilege for the application role, and the failure
// is quiet: the mail sender swallows its error and the token never
// reaches the outbox.
//
// So the grant is made again here, after the migrations, and the two
// exceptions are made again with it.
console.log("granting the table privileges");
await client.unsafe(`
  grant usage on schema public to steadlink_app, steadlink_worker;
  grant select, insert, update, delete on all tables in schema public to steadlink_app, steadlink_worker;
  grant usage, select on all sequences in schema public to steadlink_app, steadlink_worker;
  revoke select on table mail_outbox from steadlink_app;
  revoke all on table deleted_accounts from steadlink_app;
`);

await client.end();
