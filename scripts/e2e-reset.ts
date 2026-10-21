#!/usr/bin/env node
/**
 * Put the test database into a known state.
 *
 *   node --experimental-strip-types scripts/e2e-reset.ts
 *
 * The end-to-end suite runs against its own database, never the development
 * one, and it starts from nothing on every run. The migrations and the seed
 * are the ones the application ships, so the suite exercises the schema that
 * is actually deployed rather than a hand-made copy of it.
 *
 * The seed creates people with no password, because a seeded account is not
 * a real account. The suite needs to sign in, so a password is added here
 * for the three seeded people. The same password is used everywhere: these
 * are local test accounts and nothing else.
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

const ADMIN_URL =
  process.env.E2E_ADMIN_URL ?? "postgres://postgres:postgres@127.0.0.1:55440/postgres";
const DATABASE_NAME = process.env.E2E_DATABASE_NAME ?? "golink_test";
const APP_URL =
  process.env.E2E_DATABASE_URL ?? `postgres://golink:golink@127.0.0.1:55440/${DATABASE_NAME}`;

function run(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

async function main() {
  const admin = postgres(ADMIN_URL, { max: 1 });

  console.log(`dropping and recreating ${DATABASE_NAME}`);
  // `with (force)` closes the connections that are still open. The ledger
  // table in the drizzle schema survives `drop schema public`, so the
  // database itself has to go, or the migrations skip themselves.
  await admin.unsafe(`drop database if exists ${DATABASE_NAME} with (force)`);
  await admin.unsafe(`create database ${DATABASE_NAME}`);
  await admin.end();

  const migrationUrl = ADMIN_URL.replace(/\/postgres$/, `/${DATABASE_NAME}`);

  console.log("applying the migrations");
  await run(process.execPath, ["--experimental-strip-types", "packages/db/src/migrate.ts"], {
    DATABASE_URL: APP_URL,
    DATABASE_MIGRATION_URL: migrationUrl,
  });

  console.log("seeding");
  await run(process.execPath, ["--experimental-strip-types", "packages/db/src/seed.ts"], {
    DATABASE_URL: APP_URL,
    DATABASE_MIGRATION_URL: migrationUrl,
  });

  console.log("adding passwords to the seeded accounts");
  await run(process.execPath, ["--experimental-strip-types", "scripts/seed-passwords.ts"], {
    DATABASE_URL: APP_URL,
    DATABASE_MIGRATION_URL: migrationUrl,
  });

  console.log("test database ready");
}

await main();
