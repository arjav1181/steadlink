#!/usr/bin/env node
/**
 * Give the seeded people a password.
 *
 *   node --experimental-strip-types scripts/seed-passwords.ts
 *
 * The seed creates accounts with no password, because a seeded account is
 * not a real account. A local install wants to be signed into, though, so
 * the three people in the seed get the same password, and it is written
 * down in the README.
 *
 * It runs as the role that owns the accounts, so it needs
 * `DATABASE_MIGRATION_URL` — the application role cannot read the account
 * table's password column.
 */

import { hashPassword } from "better-auth/crypto";
import postgres from "postgres";

/** The password every seeded person has. */
export const DEMO_PASSWORD = "steadlink-demo-password";

const ACCOUNTS = [
  { email: "arjav@example.com", workspace: "Acme Studio" },
  { email: "mira@example.com", workspace: "Acme Studio" },
  { email: "sam@example.com", workspace: "Northwind Coffee" },
];

async function main() {
  const url = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
    process.exit(1);
  }

  const client = postgres(url, { max: 1, onnotice: () => undefined });
  const hash = await hashPassword(DEMO_PASSWORD);

  for (const account of ACCOUNTS) {
    // The seed may still be settling when this runs, so the lookup is
    // tried a few times before it is called a failure.
    let user: { id: string; workspace: string } | undefined;
    for (let attempt = 0; attempt < 5 && !user; attempt += 1) {
      const users = await client<{ id: string; workspace: string }[]>`
        select u.id, o.name as workspace from "user" u
        join member m on m.user_id = u.id
        join organization o on o.id = m.organization_id
        where u.email = ${account.email}
        limit 1
      `;
      user = users[0];
      if (!user) await new Promise((resolve) => setTimeout(resolve, 200));
    }
    if (!user) {
      console.error(`the seed did not create ${account.email}`);
      process.exit(1);
    }
    if (user.workspace !== account.workspace) {
      console.warn(`  ${account.email} is in "${user.workspace}", not "${account.workspace}"`);
    }
    const existing = await client<{ id: string }[]>`
      select id from account where user_id = ${user.id} and provider_id = 'credential' limit 1
    `;
    if (existing[0]) {
      await client`
        update account set password = ${hash}, updated_at = now() where id = ${existing[0].id}
      `;
    } else {
      await client`
        insert into account (id, account_id, provider_id, user_id, password, created_at, updated_at)
        values (gen_random_uuid(), ${user.id}, 'credential', ${user.id}, ${hash}, now(), now())
      `;
    }
    console.log(`  ${account.email} can sign in`);
  }

  await client.end();
}

await main();
