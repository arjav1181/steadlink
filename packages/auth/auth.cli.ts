/**
 * A standalone better-auth config, used only to generate the Drizzle schema
 * for better-auth's own tables.
 *
 * The real config lives in ./src/index.ts and imports the domain tables from
 * @golink/db. This one has no such dependency, so the generator can run
 * without a circular import, and it writes to a plain Drizzle instance
 * rather than the pooled one.
 *
 *   npx @better-auth/cli generate --config packages/auth/auth.cli.ts
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/drizzle-adapters";
import { apiKey, jwt, organization } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:55440/golink",
  { max: 1 },
);

export const auth = betterAuth({
  appName: "GoLink",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3210",
  secret: process.env.BETTER_AUTH_SECRET ?? "development-only-secret-change-me",
  database: drizzleAdapter(drizzle(client), { provider: "pg" }),
  emailAndPassword: { enabled: true },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      roles: {
        owner: ["*"],
        admin: ["organization:update", "link:read", "link:create", "link:update", "link:delete"],
        member: ["link:read", "link:create", "link:update"],
        viewer: ["link:read"],
      },
    }),
    apiKey({ defaultPrefix: "gl", enableMetadata: true }),
    jwt(),
  ],
  advanced: { database: { generateId: "uuid" } },
});
