#!/usr/bin/env node
/**
 * Put the seeded data back, without dropping the database.
 *
 *   node --experimental-strip-types scripts/e2e-reseed.ts
 *
 * The suite runs the specs one after another against one database, and
 * some of them change it: a link is archived here, a campaign is made
 * there. A spec that runs later then finds the world the earlier spec left
 * behind, and a test that depends on a seeded row starts failing for a
 * reason that has nothing to do with the code.
 *
 * So the data is put back before each spec file. The database itself is
 * not dropped, because the application is holding connections to it, and
 * those connections would have to be made again.
 *
 * This is the same seed the development database uses, so the suite tests
 * the rows a real install starts with.
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
const MIGRATION_URL = ADMIN_URL.replace(/\/postgres$/, `/${DATABASE_NAME}`);

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
  // The suite keeps one session, made once by the global setup, and every
  // test starts with it. The seed truncates the session table — a fresh
  // install has no sessions — so the rows are kept and put back. Without
  // that, every test would have to sign in again, and the sign-in rate
  // limit would start failing tests that have nothing to do with it.
  const client = postgres(MIGRATION_URL, { max: 1, onnotice: () => undefined });
  const sessions = await client`
    select id, expires_at, token, created_at, ip_address, user_agent, user_id,
           active_organization_id
    from session
  `;

  await run(process.execPath, ["--experimental-strip-types", "packages/db/src/seed.ts"], {
    DATABASE_URL: APP_URL,
    DATABASE_MIGRATION_URL: MIGRATION_URL,
  });

  // The seed creates people with no password, because a seeded account is
  // not a real account. The suite has to sign in, so a password is added.
  await run(process.execPath, ["--experimental-strip-types", "scripts/seed-passwords.ts"], {
    DATABASE_URL: APP_URL,
    DATABASE_MIGRATION_URL: MIGRATION_URL,
  });

  if (sessions.length > 0) {
    for (const session of sessions) {
      // A session whose person the seed did not create is not put back:
      // the account is gone, and a session pointing at nobody is worse than
      // no session. A person who signed up during the run is one of those.
      const user = await client`select id from "user" where id = ${session.user_id} limit 1`;
      if (!user[0]) continue;

      await client`
        insert into session (
          id, expires_at, token, created_at, ip_address, user_agent, user_id,
          active_organization_id
        ) values (
          ${session.id}, ${session.expires_at}, ${session.token}, ${session.created_at},
          ${session.ip_address}, ${session.user_agent}, ${session.user_id},
          ${session.active_organization_id}
        )
        on conflict (id) do nothing
      `;
    }
  }

  await client.end();
  console.log("the seeded data is back");
}

await main();
