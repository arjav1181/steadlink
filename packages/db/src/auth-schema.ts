/**
 * better-auth's own tables.
 *
 * better-auth owns identity: the user, the session, the account, the
 * organisation, the member, the invitation and the API key. The domain
 * tables in ../schema.ts point at them.
 *
 * These match better-auth 1.7's expectations exactly, so its Drizzle
 * adapter can use them without a translation layer. Ids are uuid, because
 * better-auth is configured with `advanced.database.generateId: "uuid"` and
 * the domain tables use uuid keys throughout.
 *
 * The shapes are the documented ones:
 *   user, session, account, verification, organization, member, invitation,
 *   apikey
 */

import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const user = pgTable(
  "user",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("user_email_idx").on(table.email)],
);

export const session = pgTable(
  "session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // The organisation plugin keeps the active workspace on the session.
    activeOrganizationId: text("active_organization_id"),
  },
  (table) => [
    index("session_user_idx").on(table.userId),
    index("session_expires_idx").on(table.expiresAt),
  ],
);

/**
 * The signing keys for the JWT plugin.
 *
 * The plugin mints a key pair on first use and keeps the public half in
 * the clear so a caller can verify a token, and the private half
 * encrypted with the server secret.
 */
export const jwks = pgTable(
  "jwks",
  {
    // better-auth does not supply the id, so the column has to have one.
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    publicKey: text("public_key").notNull(),
    privateKey: text("private_key").notNull(),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    alg: text("alg"),
    crv: text("crv"),
  },
  (table) => [index("jwks_created_idx").on(table.createdAt)],
);

export const account = pgTable(
  "account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("account_user_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const organization = pgTable(
  "organization",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [index("organization_slug_idx").on(table.slug)],
);

export const member = pgTable(
  "member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("member_org_user_key").on(table.organizationId, table.userId),
    index("member_user_idx").on(table.userId),
    index("member_org_idx").on(table.organizationId),
  ],
);

export const invitation = pgTable(
  "invitation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    // The invitation token lives in better-auth's `verification` table, not
    // here. The plugin's schema has no token column, and a required column
    // the plugin does not know about makes the adapter refuse to start.
    inviterId: uuid("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [index("invitation_org_idx").on(table.organizationId, table.email)],
);

/**
 * The API key table.
 *
 * The columns below are the ones the API key plugin asks for. The plugin
 * checks the table against its own schema when the server starts and
 * refuses to run if a required column is missing, so this list is not a
 * suggestion — it is the contract.
 *
 * The property names must match the plugin's field names exactly. The
 * database column names are ours to choose.
 */
export const apikey = pgTable(
  "apikey",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Which key configuration this belongs to. */
    configId: text("config_id").notNull().default("default"),
    name: text("name"),
    /** The first few characters of the token, so it can be recognised. */
    start: text("start"),
    /** The owner: a person, or a workspace. */
    referenceId: text("reference_id").notNull(),
    prefix: text("prefix"),
    /**
     * The token, hashed.
     *
     * The plugin hashes with SHA-256 and stores the digest, so a copy of
     * the database does not hand out working tokens.
     */
    key: text("key").notNull(),
    /** The workspace this token acts for. */
    orgId: uuid("org_id").references(() => organization.id, { onDelete: "cascade" }),
    /** The person who created it. */
    userId: uuid("user_id").references(() => user.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(true),
    /** How often the allowance is refilled, in milliseconds. */
    refillInterval: integer("refill_interval"),
    /** How much is refilled each time. */
    refillAmount: integer("refill_amount"),
    lastRefillAt: timestamp("last_refill_at", { withTimezone: true }),
    rateLimitEnabled: boolean("rate_limit_enabled").notNull().default(true),
    /** The window the limit applies over, in milliseconds. */
    rateLimitTimeWindow: integer("rate_limit_time_window"),
    /** How many calls are allowed in that window. */
    rateLimitMax: integer("rate_limit_max"),
    requestCount: integer("request_count").notNull().default(0),
    /** How many calls are left. Null means the token is not metered. */
    remaining: integer("remaining"),
    lastRequest: timestamp("last_request", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    /** A JSON string. The plugin reads and writes it as a string. */
    permissions: text("permissions").notNull().default("{}"),
    metadata: text("metadata").notNull().default("{}"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (table) => [
    uniqueIndex("apikey_key_idx").on(table.key),
    index("apikey_reference_idx").on(table.referenceId),
    index("apikey_user_idx").on(table.userId),
    index("apikey_org_idx").on(table.orgId),
  ],
);

/* -------------------------------------------------------------------------
 * Relations
 * ------------------------------------------------------------------------- */

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  members: many(member),
  apiKeys: many(apikey),
}));

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  invitations: many(invitation),
  apiKeys: many(apikey),
}));

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, { fields: [member.userId], references: [user.id] }),
}));
