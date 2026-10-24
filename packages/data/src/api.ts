/**
 * The data layer.
 *
 * Every screen imports from here, never from the driver. The functions have
 * the same signatures the fake layer had, so swapping the implementation
 * changed no screen.
 *
 * Two rules:
 *
 *  1. Every query runs inside withScope(), which sets the transaction-local
 *     organization the row level security policies read. A query that
 *     forgets to scope itself returns nothing rather than everything.
 *
 *  2. Every write goes through the authorisation helper, which asks the
 *     one function that answers "can this user do this to this record".
 */

import { createHash, randomBytes } from "node:crypto";
import { client, db, type Scope } from "@steadlink/db";
import * as schema from "@steadlink/db/schema";
import { and, asc, desc, sql as dsql, eq, inArray } from "drizzle-orm";

import { checkDnsRecords, type DnsRecord } from "./dns.ts";
import { currentOrg, withOrg } from "./scope.ts";
import { readSession } from "./session.ts";

export type Ctx = Scope;

/* -------------------------------------------------------------------------
 * Session
 * ------------------------------------------------------------------------- */

export interface Organization {
  id: string;
  name: string;
  slug: string;
  timezone: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  emailVerified: boolean;
}

export interface Session {
  userId: string;
  orgId: string;
  groupId: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    emailVerified: boolean;
  };
  org: Organization;
  /** The group the person is working in. */
  group: Group;
  role: string;
}

export interface Group {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  isDefault: boolean;
}

/**
 * The queries in this file are hand-written SQL, so the parameters are
 * checked by the database rather than by the compiler. postgres.js types its
 * template literal against the row type, which collapses to `never` for a
 * client that runs arbitrary statements, so the signature is declared here
 * once instead of casting at every call site.
 */
interface SqlClient {
  <T = any>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
  unsafe<T = any>(query: string, args?: unknown[]): Promise<T[]>;
  json(value: unknown): unknown;
  array(value: string[]): unknown;
  begin<T>(fn: (tx: SqlClient) => Promise<T>): Promise<T>;
  end(): Promise<void>;
}

const rawClient = client() as unknown as SqlClient;

/**
 * Several statements as one transaction, with the organization in scope.
 *
 * `client_` gives every statement a transaction of its own, which is right
 * for a single read or write and wrong for a write that only makes sense if
 * the next one lands.
 */
async function inOneTransaction<T>(orgId: string, fn: (tx: SqlClient) => Promise<T>): Promise<T> {
  return rawClient.begin(async (tx) => {
    await tx`select set_config('app.org_id', ${orgId}, true)`;
    return fn(tx);
  });
}

/**
 * The client every hand-written query goes through.
 *
 * When an organization is in scope, the query runs inside a transaction
 * that sets `app.org_id`, which is the setting the row level security
 * policies read. A query that reaches a protected table without a scope
 * returns nothing rather than everything, which is the point of the
 * policies.
 *
 * The scope comes from the async context, so a function that touches a
 * protected table only has to say which organization it is working for.
 */
const client_ = new Proxy(rawClient, {
  apply(target, _thisArg, args: unknown[]) {
    const orgId = currentOrg();
    if (!orgId) return (target as (...a: unknown[]) => unknown)(...args);
    return (rawClient.begin as (fn: (tx: SqlClient) => Promise<unknown>) => Promise<unknown>)(
      async (tx) => {
        await tx`select set_config('app.org_id', ${orgId}, true)`;
        return (tx as unknown as (...a: unknown[]) => unknown)(...args);
      },
    );
  },
  get(target, property) {
    if (property === "unsafe") {
      return (query: string, args?: unknown[]) => {
        const orgId = currentOrg();
        if (!orgId) return target.unsafe(query, args);
        return (rawClient.begin as (fn: (tx: SqlClient) => Promise<unknown>) => Promise<unknown>)(
          async (tx) => {
            await tx`select set_config('app.org_id', ${orgId}, true)`;
            return tx.unsafe(query, args);
          },
        );
      };
    }
    const value = (target as unknown as Record<string | symbol, unknown>)[property];
    return typeof value === "function" ? value.bind(target) : value;
  },
}) as unknown as SqlClient;

/**
 * postgres.js is strict about parameter types. These two helpers keep the
 * call sites readable without a cast at every one of them.
 *
 * The JSON one is a plain string, and the call sites cast it.
 * It cannot be `sql.json()`, because Drizzle's postgres-js driver takes the
 * shared client and replaces its JSON serializer with a pass-through, so a
 * JSON value would reach the wire as an object and the driver would try to
 * measure it as a string. A string with an explicit cast is understood by
 * the server whichever driver handled the connection.
 */
const asJson = (value: unknown) => JSON.stringify(value);
const asArray = (value: string[]) => client_.array(value);

/** The signed-in session, or null. */
export async function getSession(): Promise<Session | null> {
  // The session is the person behind the cookie. Without a cookie there is
  // no session, and the answer is "not signed in" rather than "whoever
  // happens to be first in the database".
  const identity = await readSession();
  if (!identity) return null;

  const rows = await client_`
    select
      u.id, u.name, u.email, u.image, u.email_verified,
      o.id as org_id, o.name as org_name, o.slug as org_slug,
      m.role, m.organization_id,
      (select g.id from groups g
        where g.org_id = m.organization_id and g.is_default
        limit 1) as default_group_id
    from "user" u
    join member m on m.user_id = u.id
    join organization o on o.id = m.organization_id
    where u.id = ${identity.userId}
      and (
        ${identity.organizationId ?? null}::uuid is null
        or m.organization_id = ${identity.organizationId ?? null}::uuid
      )
    order by m.created_at
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;

  // The group the person is working in. The one they chose comes from the
  // request, so it is checked against the workspace before it is used: a
  // group from another workspace is not a group here, and a group that
  // does not exist is not a group at all. Either way the workspace's
  // default group is what they get.
  const group = await resolveGroup(row.org_id, row.default_group_id, identity.groupId ?? null);

  return {
    userId: row.id,
    orgId: row.org_id,
    groupId: group?.id ?? "",
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      image: row.image,
      emailVerified: row.email_verified,
    },
    org: {
      id: row.org_id,
      name: row.org_name,
      slug: row.org_slug,
      timezone: row.timezone,
    },
    group: group ?? {
      id: "",
      orgId: row.org_id,
      name: "",
      slug: "",
      isDefault: true,
    },
    role: row.role,
  };
}

/**
 * The group in scope: the one that was asked for, or the workspace's
 * default one. A group that is not in the workspace is ignored.
 */
async function resolveGroup(
  orgId: string,
  defaultGroupId: string | null,
  wantedGroupId: string | null,
): Promise<Group | null> {
  if (wantedGroupId) {
    const chosen = await client_`
      select id, org_id, name, slug, is_default
      from groups
      where id = ${wantedGroupId} and org_id = ${orgId}
      limit 1
    `;
    if (chosen[0]) {
      return {
        id: chosen[0].id,
        orgId: chosen[0].org_id,
        name: chosen[0].name,
        slug: chosen[0].slug,
        isDefault: chosen[0].is_default,
      };
    }
  }
  if (!defaultGroupId) return null;
  const fallback = await client_`
    select id, org_id, name, slug, is_default
    from groups
    where id = ${defaultGroupId}
    limit 1
  `;
  const row = fallback[0];
  if (!row) return null;
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    slug: row.slug,
    isDefault: row.is_default,
  };
}

export async function getCtx(): Promise<Ctx> {
  const session = await getSession();
  if (!session) throw new Error("not signed in");
  return { userId: session.userId, orgId: session.orgId, groupId: session.groupId };
}

export async function getPlan() {
  const rows = await client_`select * from plans limit 1`;
  return rows[0]!;
}

/* -------------------------------------------------------------------------
 * Authorisation
 * ------------------------------------------------------------------------- */

export type Action =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "invite"
  | "manage_webhooks"
  | "manage_tokens"
  | "manage_org";

const ALLOWED: Record<string, readonly Action[]> = {
  owner: [
    "read",
    "create",
    "update",
    "delete",
    "invite",
    "manage_webhooks",
    "manage_tokens",
    "manage_org",
  ],
  admin: ["read", "create", "update", "delete", "invite", "manage_webhooks", "manage_tokens"],
  member: ["read", "create", "update"],
  viewer: ["read"],
};

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(action: Action) {
    super(`You do not have permission to ${action.replace(/_/g, " ")}.`);
  }
}

export async function can(
  scope: Ctx,
  action: Action,
  record?: { orgId?: string | null },
): Promise<boolean> {
  if (!scope.userId) return false;
  if (record?.orgId && record.orgId !== scope.orgId) return false;
  const rows = await client_`
    select role from member
    where user_id = ${scope.userId} and organization_id = ${scope.orgId}
    limit 1
  `;
  const role = rows[0]?.role;
  if (!role) return false;
  return (ALLOWED[role] ?? []).includes(action);
}

export async function assertCan(scope: Ctx, action: Action, record?: { orgId?: string | null }) {
  if (!(await can(scope, action, record))) throw new ForbiddenError(action);
}

/* -------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

/**
 * A Postgres array literal.
 *
 * postgres.js will not infer a parameter type for a plain JavaScript array,
 * so the array is built as a literal and cast in the statement. The values
 * are escaped, so a quote in a tag cannot break out of the literal.
 */
function _pgTextArray(values: string[]): string {
  if (!values.length) return "{}";
  return `{${values.map((value) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")}}`;
}

/**
 * The scopes a token carries, and the permission map better-auth reads.
 *
 * A scope is `resource:verb`. The verb expands into better-auth's actions,
 * so a token with `links:write` is a token that can create and update, and
 * one with `links:delete` can also remove. The `permissions` column is
 * text, and better-auth stores a JSON string in it, so the shape is
 * written to match.
 */
const SCOPE_ACTIONS: Record<string, string[]> = {
  read: ["read"],
  write: ["create", "update"],
  delete: ["delete"],
};

export function permissionsFor(scopes: string[]): string {
  const permissions: Record<string, string[]> = {};
  for (const scope of scopes) {
    const [resource, verb] = scope.split(":");
    if (!resource || !verb) continue;
    for (const action of SCOPE_ACTIONS[verb] ?? []) {
      const existing = permissions[resource] ?? [];
      if (!existing.includes(action)) existing.push(action);
      permissions[resource] = existing;
    }
  }
  return JSON.stringify({ scopes, ...permissions });
}

function readScopes(value: unknown): string[] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value) as { scopes?: unknown };
    return Array.isArray(parsed.scopes) ? (parsed.scopes as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * A timestamp as an ISO string.
 *
 * The driver hands back timestamps as strings in some configurations, so
 * every timestamp goes through here rather than assuming a Date.
 */
function dayOf(value: Date | string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return (value instanceof Date ? value : new Date(value)).toISOString().slice(0, 10);
}

/** A timestamp as an ISO string. An absent one becomes the empty string. */
function isoRequired(value: Date | string | null | undefined): string {
  return iso(value) ?? "";
}

function iso(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/**
 * The column names are snake_case; the screens use camelCase.
 *
 * A query that says `select *` gives back the column names, and a screen
 * that reads `hook.fetchTags` gets nothing when the column is
 * `fetch_tags`. That failure is quiet: the field is simply undefined, and
 * the screen shows a wrong answer rather than an error.
 *
 * So the rows are converted on the way out. Every function that returns
 * raw rows goes through here.
 */
type Camel<S extends string> = S extends `${infer Head}_${infer Tail}`
  ? `${Head}${Capitalize<Tail>}` | S
  : S;

type CamelKeys<T> = { [K in keyof T as K extends string ? Camel<K> : K]: T[K] };

function camelRows<T extends Record<string, unknown>>(rows: T[]): CamelKeys<T>[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      out[key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase())] = value;
    }
    return out as CamelKeys<T>;
  });
}

/** A uuid, the shape every id in the application has. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function codeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function randomCode(): string {
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 7; i += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

/** The codes the app owns, so a back-half never shadows a route. */
export const RESERVED_CODES: ReadonlySet<string> = new Set([
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
]);

async function codeTaken(domainId: string, code: string, exceptLinkId?: string): Promise<boolean> {
  const rows = await client_`
    select id from links
    where domain_id = ${domainId} and code = ${code} and (${exceptLinkId ?? null}::uuid is null or id <> ${exceptLinkId ?? null}::uuid)
    union all
    select id from qr_codes
    where domain_id = ${domainId} and code = ${code}
    limit 1
  `;
  return rows.length > 0;
}

async function logActivity(
  scope: Ctx,
  action: string,
  targetType: string | null,
  targetId: string | null,
  metadata: Record<string, unknown> = {},
) {
  return withOrg(scope.orgId, async () => {
    await client_`
      insert into activity_log (org_id, user_id, action, target_type, target_id, metadata)
      values (${scope.orgId}, ${scope.userId}, ${action}, ${targetType}, ${targetId}, ${asJson(metadata)}::jsonb)
    `;
  });
}

async function bumpCounter(scope: Ctx, field: "links" | "qr_codes" | "pages", delta: number) {
  return withOrg(scope.orgId, async () => {
    const column =
      field === "links" ? "links_count" : field === "qr_codes" ? "qr_codes_count" : "pages_count";
    await client_.unsafe(
      `update organization_counters set ${column} = greatest(0, ${column} + ${delta}), updated_at = now() where org_id = '${scope.orgId}'`,
    );
  });
}

/* -------------------------------------------------------------------------
 * Links
 * ------------------------------------------------------------------------- */

export interface LinkWithMeta {
  id: string;
  orgId: string;
  groupId: string;
  domainId: string;
  code: string;
  longUrl: string;
  title: string | null;
  rootLinkId: string | null;
  version: number;
  campaignId: string | null;
  channelId: string | null;
  utmParams: Record<string, unknown>;
  tags: string[];
  archivedAt: string | null;
  hiddenAt: string | null;
  expiresAt: string | null;
  clickCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  domain: { id: string; host: string; kind: string; verificationStatus: string };
  group: { id: string; name: string; slug: string };
  qrCode: QrCode | null;
  clickCountTotal: number;
  scanCount: number;
  engagementCount: number;
}

export interface LinkFilters {
  query?: string;
  tags?: string[];
  state?: "active" | "hidden" | "archived" | "all";
  campaignId?: string;
  createdBy?: string;
  hasQr?: boolean;
  hasRouting?: boolean;
  hasDeeplink?: boolean;
  expired?: "expired" | "expiring" | "none";
  sort?: "newest" | "oldest" | "clicks" | "title";
  limit?: number;
  /** How many rows to skip. The public API turns a cursor into one. */
  offset?: number;
  cursor?: string;
  /**
   * The group to look in. A group partitions a workspace's links, so a
   * screen that works with links works in one group at a time. Left out,
   * every group is searched.
   */
  groupId?: string;
  /** The creator, by their id. */
  creatorId?: string;
}

export async function listLinks(ctx: Ctx, filters: LinkFilters = {}) {
  const clauses = [eq(schema.links.orgId, ctx.orgId)];

  if (filters.groupId) clauses.push(eq(schema.links.groupId, filters.groupId));

  const offset = filters.offset ?? 0;

  if (filters.state && filters.state !== "all") {
    if (filters.state === "active") {
      clauses.push(dsql`${schema.links.archivedAt} is null and ${schema.links.hiddenAt} is null`);
    }
    if (filters.state === "hidden") {
      clauses.push(
        dsql`${schema.links.hiddenAt} is not null and ${schema.links.archivedAt} is null`,
      );
    }
    if (filters.state === "archived") clauses.push(dsql`${schema.links.archivedAt} is not null`);
  }
  if (filters.query) {
    const needle = `%${filters.query.toLowerCase()}%`;
    clauses.push(
      dsql`(${schema.links.code} ilike ${needle}
        or coalesce(${schema.links.title}, '') ilike ${needle}
        or ${schema.links.longUrl} ilike ${needle})`,
    );
  }
  if (filters.campaignId) clauses.push(eq(schema.links.campaignId, filters.campaignId));
  if (filters.createdBy) clauses.push(eq(schema.links.createdBy, filters.createdBy));
  if (filters.hasQr !== undefined) {
    clauses.push(
      filters.hasQr
        ? dsql`exists (select 1 from ${schema.qrCodes} q where q.link_id = ${schema.links.id})`
        : dsql`not exists (select 1 from ${schema.qrCodes} q where q.link_id = ${schema.links.id})`,
    );
  }
  if (filters.hasRouting) {
    clauses.push(
      dsql`exists (select 1 from ${schema.linkRoutingRules} r where r.link_id = ${schema.links.id})`,
    );
  }
  if (filters.hasDeeplink !== undefined) {
    clauses.push(
      filters.hasDeeplink
        ? dsql`exists (select 1 from ${schema.linkDeeplinks} d where d.link_id = ${schema.links.id})`
        : dsql`not exists (select 1 from ${schema.linkDeeplinks} d where d.link_id = ${schema.links.id})`,
    );
  }
  if (filters.expired) {
    if (filters.expired === "none") clauses.push(dsql`${schema.links.expiresAt} is null`);
    if (filters.expired === "expired") clauses.push(dsql`${schema.links.expiresAt} < now()`);
    if (filters.expired === "expiring") {
      clauses.push(
        dsql`${schema.links.expiresAt} >= now() and ${schema.links.expiresAt} <= now() + interval '7 days'`,
      );
    }
  }
  if (filters.tags?.length) {
    clauses.push(dsql`${schema.links.tags} @> ${filters.tags}::text[]`);
  }

  const orderBy =
    filters.sort === "oldest"
      ? asc(schema.links.createdAt)
      : filters.sort === "clicks"
        ? desc(schema.links.clickCount)
        : filters.sort === "title"
          ? asc(dsql`coalesce(${schema.links.title}, ${schema.links.code})`)
          : desc(schema.links.createdAt);

  const rows = await db()
    .select({
      link: schema.links,
      host: schema.domains.host,
      domainKind: schema.domains.kind,
      verificationStatus: schema.domains.verificationStatus,
      groupName: schema.groups.name,
      groupSlug: schema.groups.slug,
    })
    .from(schema.links)
    .innerJoin(schema.domains, eq(schema.domains.id, schema.links.domainId))
    .innerJoin(schema.groups, eq(schema.groups.id, schema.links.groupId))
    .where(and(...clauses))
    .orderBy(orderBy)
    .limit(filters.limit ?? 25)
    .offset(filters.offset ?? 0);

  const engagement = await db()
    .select({
      linkId: schema.engagementEvents.linkId,
      count: dsql<number>`count(*)::int`,
    })
    .from(schema.engagementEvents)
    .where(eq(schema.engagementEvents.orgId, ctx.orgId))
    .groupBy(schema.engagementEvents.linkId);

  const links = rows.map((row) => {
    const link = row.link;
    return {
      id: link.id,
      orgId: link.orgId,
      groupId: link.groupId,
      domainId: link.domainId,
      code: link.code,
      longUrl: link.longUrl,
      title: link.title,
      rootLinkId: link.rootLinkId,
      version: link.version,
      campaignId: link.campaignId,
      channelId: link.channelId,
      utmParams: (link.utmParams ?? {}) as Record<string, unknown>,
      tags: link.tags ?? [],
      archivedAt: link.archivedAt ? link.archivedAt.toISOString() : null,
      hiddenAt: link.hiddenAt ? link.hiddenAt.toISOString() : null,
      expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
      clickCount: link.clickCount,
      createdBy: link.createdBy,
      createdAt: link.createdAt.toISOString(),
      updatedAt: link.updatedAt.toISOString(),
      domain: {
        id: link.domainId,
        host: row.host,
        kind: row.domainKind,
        verificationStatus: row.verificationStatus,
      },
      group: { id: link.groupId, name: row.groupName, slug: row.groupSlug },
      qrCode: null,
      clickCountTotal: link.clickCount,
      scanCount: 0,
      engagementCount: engagement.find((row) => row.linkId === link.id)?.count ?? 0,
    } as LinkWithMeta;
  });

  // A link and a code can be two names for the same place, so the list
  // says which links have a code against them.
  const codes = await qrCodesForLinks(
    ctx.orgId,
    links.map((link) => link.id),
  );
  for (const link of links) {
    link.qrCode = codes.get(link.id) ?? null;
    link.scanCount = link.qrCode?.scanCountTotal ?? 0;
  }

  const counted = await db()
    .select({ count: dsql<number>`count(*)::int` })
    .from(schema.links)
    .where(and(...clauses));

  const total = counted[0]?.count ?? links.length;

  return {
    links,
    nextCursor:
      offset + links.length < total ? encodeCursor(offset + links.length) : (null as string | null),
    total,
  };
}

/**
 * The QR codes that point at a set of links, keyed by the link's id.
 *
 * A link and a code are two names for the same place. The list of links
 * says which of them have a code against them, and the detail screen
 * shows the code itself, so both need the row.
 */
async function qrCodesForLinks(orgId: string, linkIds: string[]): Promise<Map<string, QrCode>> {
  const found = new Map<string, QrCode>();
  if (linkIds.length === 0) return found;

  const rows = await db()
    .select({
      qr: schema.qrCodes,
      scans: dsql<number>`(select count(*) from ${schema.engagementEvents} e where e.qr_code_id = ${schema.qrCodes}.id)::int`,
    })
    .from(schema.qrCodes)
    .where(and(eq(schema.qrCodes.orgId, orgId), inArray(schema.qrCodes.linkId, linkIds)));

  for (const row of rows) {
    const qr = row.qr;
    if (!qr.linkId) continue;
    found.set(qr.linkId, {
      id: qr.id,
      orgId: qr.orgId,
      groupId: qr.groupId,
      linkId: qr.linkId,
      domainId: qr.domainId,
      code: qr.code,
      longUrl: qr.longUrl,
      title: qr.title,
      design: (qr.design ?? {}) as Record<string, unknown>,
      tags: qr.tags ?? [],
      expiresAt: qr.expiresAt ? qr.expiresAt.toISOString() : null,
      archivedAt: qr.archivedAt ? qr.archivedAt.toISOString() : null,
      scanCount: qr.scanCount,
      createdBy: qr.createdBy,
      createdAt: qr.createdAt.toISOString(),
      updatedAt: qr.updatedAt.toISOString(),
      scanCountTotal: row.scans,
      link: null,
    } as QrCode);
  }
  return found;
}

/**
 * The cursor is the offset, in a form a caller should not hand-edit.
 *
 * The public API hands one out and takes one back; the screens use the
 * same thing, so there is one way to ask for "the next page" rather than
 * two.
 */
export function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  try {
    const value = Number(Buffer.from(cursor, "base64url").toString("utf8"));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

/**
 * One link, with everything attached to it.
 *
 * A direct query rather than a scan of the first few hundred links: a link
 * outside that window has to be reachable, and the API looks links up by id.
 */
export async function getLink(ctx: Ctx, linkId: string): Promise<LinkWithMeta | null> {
  // The id is a uuid. A caller that sends anything else is asking about a
  // link that does not exist, and the answer is "no" rather than a
  // database error about the type.
  if (!UUID.test(linkId)) return null;

  const rows = await db()
    .select({
      link: schema.links,
      host: schema.domains.host,
      domainKind: schema.domains.kind,
      verificationStatus: schema.domains.verificationStatus,
      groupName: schema.groups.name,
      groupSlug: schema.groups.slug,
    })
    .from(schema.links)
    .innerJoin(schema.domains, eq(schema.domains.id, schema.links.domainId))
    .innerJoin(schema.groups, eq(schema.groups.id, schema.links.groupId))
    .where(and(eq(schema.links.orgId, ctx.orgId), eq(schema.links.id, linkId)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const engagement = await db()
    .select({ count: dsql<number>`count(*)::int` })
    .from(schema.engagementEvents)
    .where(
      and(eq(schema.engagementEvents.orgId, ctx.orgId), eq(schema.engagementEvents.linkId, linkId)),
    );

  const qrRows = await db()
    .select({ id: schema.qrCodes.id })
    .from(schema.qrCodes)
    .where(and(eq(schema.qrCodes.orgId, ctx.orgId), eq(schema.qrCodes.linkId, linkId)))
    .limit(1);
  const qrCode = qrRows[0] ? await getQrCode(ctx, qrRows[0].id) : null;

  const link = row.link;
  return {
    id: link.id,
    orgId: link.orgId,
    groupId: link.groupId,
    domainId: link.domainId,
    code: link.code,
    longUrl: link.longUrl,
    title: link.title,
    rootLinkId: link.rootLinkId,
    version: link.version,
    campaignId: link.campaignId,
    channelId: link.channelId,
    utmParams: (link.utmParams ?? {}) as Record<string, unknown>,
    tags: link.tags ?? [],
    archivedAt: link.archivedAt ? link.archivedAt.toISOString() : null,
    hiddenAt: link.hiddenAt ? link.hiddenAt.toISOString() : null,
    expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
    clickCount: link.clickCount,
    createdBy: link.createdBy,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
    domain: {
      id: link.domainId,
      host: row.host,
      kind: row.domainKind,
      verificationStatus: row.verificationStatus,
    },
    group: { id: link.groupId, name: row.groupName, slug: row.groupSlug },
    qrCode,
    clickCountTotal: link.clickCount,
    scanCount: 0,
    engagementCount: engagement[0]?.count ?? 0,
  };
}

export async function getLinkByCode(code: string) {
  const rows = await client_`
    select * from links where code = ${code} limit 1
  `;
  return rows[0] ?? null;
}

export interface CreateLinkInput {
  longUrl: string;
  domainId?: string;
  code?: string;
  title?: string;
  tags?: string[];
  groupId?: string;
  campaignId?: string;
  channelId?: string;
  utmParams?: Record<string, string>;
  expiresAt?: string | null;
  createQr?: boolean;
}

export async function createLink(ctx: Ctx, input: CreateLinkInput) {
  await assertCan(ctx, "create");
  if (!isValidUrl(input.longUrl)) {
    throw new DataError("That does not look like a valid URL.", "INVALID_URL");
  }

  // An expiry has to be far enough away to be worth setting, and not so far
  // away that it becomes a plan to forget. Five minutes, and one year.
  if (input.expiresAt) {
    const at = new Date(input.expiresAt).getTime();
    if (Number.isNaN(at)) {
      throw new DataError("That is not a date we can read.", "INVALID_EXPIRY");
    }
    if (at < Date.now() + 5 * 60_000) {
      throw new DataError("Give it at least five minutes.", "EXPIRY_TOO_SOON");
    }
    if (at > Date.now() + 365 * 86_400_000) {
      throw new DataError("A link can expire up to a year from now.", "EXPIRY_TOO_LATE");
    }
  }

  const domainRows = await client_`
    select * from domains
    where id = ${input.domainId ?? null}::uuid or (org_id = ${ctx.orgId} and kind = 'default')
    order by (id = ${input.domainId ?? null}::uuid) desc
    limit 1
  `;
  const domain = domainRows[0];
  if (!domain) throw new DataError("That domain is not available.", "DOMAIN_NOT_FOUND");

  const code = input.code?.trim() || randomCode();
  if (!/^[A-Za-z0-9_-]{2,255}$/.test(code)) {
    throw new DataError(
      "Use 2 to 255 characters: letters, digits, dash and underscore.",
      "INVALID_CODE",
    );
  }
  if (RESERVED_CODES.has(code.toLowerCase())) {
    throw new DataError(
      `"${code}" is reserved by the app. Pick another back-half.`,
      "RESERVED_CODE",
    );
  }
  if (await codeTaken(domain.id, code)) {
    throw new DataError(`"${code}" is already taken on ${domain.host}.`, "CODE_TAKEN");
  }

  const rows = await client_`
    insert into links (
      org_id, group_id, domain_id, code, long_url, title, version, utm_params,
      tags, expires_at, created_by, created_at, updated_at
    ) values (
      ${ctx.orgId}, ${input.groupId ?? ctx.groupId}, ${domain.id}, ${code}, ${input.longUrl},
      ${input.title?.trim() || null}, 1, ${asJson(input.utmParams ?? {})}::jsonb,
      ${asArray(input.tags ?? [])}, ${input.expiresAt ?? null},
      ${ctx.userId}, now(), now()
    )
    returning *
  `;
  const link = rows[0]!;
  await enqueueWebhook(ctx.orgId, "link.created", {
    event: "link.created",
    created_at: new Date().toISOString(),
    link: linkPayload({
      id: link.id,
      code: link.code,
      long_url: link.long_url,
      title: link.title,
      host: domain.host,
    }),
  });

  await bumpCounter(ctx, "links", 1);
  if (input.createQr) {
    await createQrCode(ctx, {
      longUrl: input.longUrl,
      code: `${code}-qr`,
      title: input.title,
      linkId: link.id,
    });
  }
  await logActivity(ctx, "link.created", "link", link.id, { code });
  return link;
}

export class DataError extends Error {
  readonly code: string;

  // Not a parameter property: Node's type stripping rejects those, and the
  // custom server runs this file directly.
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export async function updateLink(
  ctx: Ctx,
  linkId: string,
  patch: Partial<Pick<LinkWithMeta, "title" | "tags" | "expiresAt" | "longUrl">>,
) {
  await assertCan(ctx, "update");
  if (patch.longUrl !== undefined && !isValidUrl(patch.longUrl)) {
    throw new DataError("That does not look like a valid URL.", "INVALID_URL");
  }
  // A link with no name shows the back-half in the list, and the list stops
  // being readable. A title is not optional.
  if (patch.title !== undefined && !patch.title?.trim()) {
    throw new DataError("Give the link a name.", "TITLE_REQUIRED");
  }
  // Only the fields that were actually given are set. A `case when` in the
  // SQL would still send every value as a parameter, and a field that was
  // left out would arrive as undefined, which the driver refuses to send.
  const rows = await db()
    .update(schema.links)
    .set({
      ...(patch.title !== undefined ? { title: patch.title?.trim() || null } : {}),
      ...(patch.longUrl !== undefined ? { longUrl: patch.longUrl } : {}),
      ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
      ...(patch.expiresAt !== undefined
        ? { expiresAt: patch.expiresAt ? new Date(patch.expiresAt) : null }
        : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(schema.links.id, linkId), eq(schema.links.orgId, ctx.orgId)))
    .returning();
  if (!rows[0]) throw new DataError("That link no longer exists.", "NOT_FOUND");
  await logActivity(ctx, "link.updated", "link", linkId, {});
  await enqueueWebhook(ctx.orgId, "link.updated", {
    event: "link.updated",
    created_at: new Date().toISOString(),
    link: linkPayload({
      id: rows[0].id,
      code: rows[0].code,
      long_url: rows[0].longUrl,
      title: rows[0].title,
    }),
  });
  return rows[0];
}

/**
 * Changing the back-half mints a NEW link row that shares the root id. The
 * old code keeps working and keeps its own numbers, and the old code can
 * never be reused on that domain.
 */
export async function changeBackHalf(ctx: Ctx, linkId: string, code: string) {
  await assertCan(ctx, "update");
  const current = await getLink(ctx, linkId);
  if (!current) throw new DataError("That link no longer exists.", "NOT_FOUND");
  if (!/^[A-Za-z0-9_-]{2,255}$/.test(code)) {
    throw new DataError(
      "Use 2 to 255 characters: letters, digits, dash and underscore.",
      "INVALID_CODE",
    );
  }
  if (RESERVED_CODES.has(code.toLowerCase())) {
    throw new DataError(
      `"${code}" is reserved by the app. Pick another back-half.`,
      "RESERVED_CODE",
    );
  }
  if (await codeTaken(current.domainId, code)) {
    throw new DataError(`"${code}" is already taken on that domain.`, "CODE_TAKEN");
  }
  const rows = await client_`
    insert into links (
      org_id, group_id, domain_id, code, long_url, title, root_link_id, version,
      utm_params, tags, archived_at, hidden_at, expires_at, created_by, created_at, updated_at
    )
    select org_id, group_id, domain_id, ${code}, long_url, title,
      coalesce(root_link_id, id), version + 1,
      utm_params, tags, archived_at, hidden_at, expires_at, created_by, now(), now()
    from links where id = ${linkId}
    returning *
  `;
  if (!rows[0]) throw new DataError("That link no longer exists.", "NOT_FOUND");
  await bumpCounter(ctx, "links", 1);
  await logActivity(ctx, "link.back_half_changed", "link", rows[0].id, {
    from: current.code,
    to: code,
  });
  await enqueueWebhook(ctx.orgId, "link.updated", {
    event: "link.updated",
    created_at: new Date().toISOString(),
    link: linkPayload({
      id: rows[0].id,
      code: rows[0].code,
      long_url: rows[0].long_url,
      title: rows[0].title,
      host: current.domain.host,
    }),
    change: { from: current.code, to: code },
  });
  return rows[0];
}

export async function setLinkState(
  ctx: Ctx,
  linkId: string,
  state: "hide" | "show" | "archive" | "restore",
) {
  await assertCan(ctx, state === "restore" ? "update" : "update");
  const rows = await client_`
    update links set
      hidden_at = case when ${state} = 'hide' then now() when ${state} = 'show' then null else hidden_at end,
      archived_at = case when ${state} = 'archive' then now() when ${state} = 'restore' then null else archived_at end,
      updated_at = now()
    where id = ${linkId} and org_id = ${ctx.orgId}
    returning *
  `;
  if (!rows[0]) throw new DataError("That link no longer exists.", "NOT_FOUND");
  await logActivity(ctx, `link.${state}d`, "link", linkId, {});
  await enqueueWebhook(ctx.orgId, "link.updated", {
    event: "link.updated",
    created_at: new Date().toISOString(),
    link: linkPayload({
      id: rows[0].id,
      code: rows[0].code,
      long_url: rows[0].long_url,
      title: rows[0].title,
    }),
    state,
  });
  return rows[0];
}

export async function deleteLink(ctx: Ctx, linkId: string) {
  await assertCan(ctx, "delete");
  const rows = await client_`
    delete from links where id = ${linkId} and org_id = ${ctx.orgId} returning id
  `;
  if (!rows[0]) throw new DataError("That link no longer exists.", "NOT_FOUND");
  await bumpCounter(ctx, "links", -1);
  await logActivity(ctx, "link.deleted", "link", linkId, {});
}

export async function bulkUpdateLinks(
  ctx: Ctx,
  action: "archive" | "hide" | "unhide" | "tag" | "untag",
  ids: string[],
  tags: string[] = [],
) {
  await assertCan(ctx, action === "unhide" ? "update" : "update");
  const updated: string[] = [];
  const failed: { id: string; reason: string }[] = [];

  for (const id of ids) {
    const rows = await client_`
      update links set
        archived_at = case when ${action} = 'archive' then now() else archived_at end,
        hidden_at = case when ${action} = 'hide' then now() when ${action} = 'unhide' then null else hidden_at end,
        tags = case
          when ${action} = 'tag' then (select array(select distinct unnest(tags || ${tags}::text[])))
          when ${action} = 'untag' then (select coalesce(array_agg(value), '{}'::text[]) from unnest(tags) value where value <> all(${tags}::text[]))
          else tags
        end,
        updated_at = now()
      where id = ${id} and org_id = ${ctx.orgId}
      returning id
    `;
    if (rows[0]) updated.push(id);
    else failed.push({ id, reason: "Not found" });
  }
  await logActivity(ctx, `links.bulk_${action}`, "link", null, { count: ids.length });
  return { updated, failed };
}

/* -------------------------------------------------------------------------
 * Routing rules and deep links
 * ------------------------------------------------------------------------- */

export interface RoutingRule {
  id: string;
  linkId: string;
  position: number;
  longUrl: string;
  countryMatch: string[];
  countryExclude: string[];
  regionMatch: string[];
  regionExclude: string[];
  deviceMatch: string[];
  deviceExclude: string[];
  osMatch: string[];
  osExclude: string[];
}

export async function getRoutingRules(ctx: Ctx, linkId: string): Promise<RoutingRule[]> {
  return withOrg(ctx.orgId, async () => {
    const rows = await client_`
      select * from link_routing_rules
      where link_id = ${linkId} and link_id in (select id from links where org_id = ${ctx.orgId})
      order by position
    `;
    return rows.map((row) => ({
      id: row.id,
      linkId: row.link_id,
      position: row.position,
      longUrl: row.long_url,
      countryMatch: row.country_match ?? [],
      countryExclude: row.country_exclude ?? [],
      regionMatch: row.region_match ?? [],
      regionExclude: row.region_exclude ?? [],
      deviceMatch: row.device_match ?? [],
      deviceExclude: row.device_exclude ?? [],
      osMatch: row.os_match ?? [],
      osExclude: row.os_exclude ?? [],
    }));
  });
}

export async function replaceRoutingRules(
  ctx: Ctx,
  linkId: string,
  rules: {
    longUrl: string;
    countryMatch?: string[];
    countryExclude?: string[];
    regionMatch?: string[];
    regionExclude?: string[];
    deviceMatch?: string[];
    deviceExclude?: string[];
    osMatch?: string[];
    osExclude?: string[];
  }[],
) {
  return withOrg(ctx.orgId, async () => {
    await assertCan(ctx, "update");
    if (rules.length > 10) {
      throw new DataError("A link can have at most 10 routing rules.", "TOO_MANY_RULES");
    }
    await client_`delete from link_routing_rules where link_id = ${linkId}`;
    for (const [index, rule] of rules.entries()) {
      await client_`
        insert into link_routing_rules (
          link_id, position, long_url, country_match, country_exclude,
          region_match, region_exclude, device_match, device_exclude,
          os_match, os_exclude
        ) values (
          ${linkId}, ${index}, ${rule.longUrl},
          ${asArray(rule.countryMatch ?? [])}, ${asArray(rule.countryExclude ?? [])},
          ${asArray(rule.regionMatch ?? [])}, ${asArray(rule.regionExclude ?? [])},
          ${asArray(rule.deviceMatch ?? [])}, ${asArray(rule.deviceExclude ?? [])},
          ${asArray(rule.osMatch ?? [])}, ${asArray(rule.osExclude ?? [])}
        )
      `;
    }
    await logActivity(ctx, "link.routing_updated", "link", linkId, { rules: rules.length });
    return getRoutingRules(ctx, linkId);
  });
}

export async function listDeeplinks(ctx: Ctx, linkId: string) {
  return withOrg(ctx.orgId, async () => {
    const rows = await client_`
      select * from link_deeplinks
      where link_id = ${linkId} and link_id in (select id from links where org_id = ${ctx.orgId})
    `;
    return camelRows(rows);
  });
}

export async function addDeeplink(
  ctx: Ctx,
  linkId: string,
  input: {
    appUriPath: string;
    installUrl: string | null;
    os: "ios" | "android";
    installType?: string;
  },
) {
  return withOrg(ctx.orgId, async () => {
    await assertCan(ctx, "update");
    const rows = await client_`
      insert into link_deeplinks (link_id, app_uri_path, install_url, os, install_type)
      values (${linkId}, ${input.appUriPath}, ${input.installUrl}, ${input.os}, ${input.installType ?? "no_install"})
      returning *
    `;
    await logActivity(ctx, "link.deeplink_added", "link", linkId, { os: input.os });
    return rows[0]!;
  });
}

export async function removeDeeplink(ctx: Ctx, linkId: string, deeplinkId: string) {
  return withOrg(ctx.orgId, async () => {
    await assertCan(ctx, "update");
    await client_`
      delete from link_deeplinks where id = ${deeplinkId} and link_id = ${linkId}
    `;
  });
}

/* -------------------------------------------------------------------------
 * QR codes
 * ------------------------------------------------------------------------- */

export interface QrCode {
  id: string;
  orgId: string;
  groupId: string;
  linkId: string | null;
  domainId: string;
  code: string;
  longUrl: string;
  title: string | null;
  design: Record<string, unknown>;
  tags: string[];
  expiresAt: string | null;
  archivedAt: string | null;
  scanCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  scanCountTotal?: number;
  link?: { id: string; code: string; title: string | null } | null;
}

export async function listQrCodes(
  ctx: Ctx,
  filters: { query?: string; tag?: string; groupId?: string } = {},
) {
  const clauses = [eq(schema.qrCodes.orgId, ctx.orgId)];
  if (filters.groupId) clauses.push(eq(schema.qrCodes.groupId, filters.groupId));
  if (filters.query) {
    const needle = `%${filters.query.toLowerCase()}%`;
    clauses.push(
      dsql`(${schema.qrCodes.code} ilike ${needle} or coalesce(${schema.qrCodes.title}, '') ilike ${needle})`,
    );
  }
  if (filters.tag) clauses.push(dsql`${filters.tag} = any(${schema.qrCodes.tags})`);

  const rows = await db()
    .select({
      qr: schema.qrCodes,
      scans: dsql<number>`(select count(*) from ${schema.engagementEvents} e where e.qr_code_id = ${dsql`${schema.qrCodes}`}.id)::int`,
    })
    .from(schema.qrCodes)
    .where(and(...clauses))
    .orderBy(desc(schema.qrCodes.createdAt));

  return rows.map((row) => {
    const qr = row.qr;
    return {
      id: qr.id,
      orgId: qr.orgId,
      groupId: qr.groupId,
      linkId: qr.linkId,
      domainId: qr.domainId,
      code: qr.code,
      longUrl: qr.longUrl,
      title: qr.title,
      design: (qr.design ?? {}) as Record<string, unknown>,
      tags: qr.tags ?? [],
      expiresAt: qr.expiresAt ? qr.expiresAt.toISOString() : null,
      archivedAt: qr.archivedAt ? qr.archivedAt.toISOString() : null,
      scanCount: qr.scanCount,
      createdBy: qr.createdBy,
      createdAt: qr.createdAt.toISOString(),
      updatedAt: qr.updatedAt.toISOString(),
      scanCountTotal: row.scans,
      link: null,
    } as QrCode;
  });
}

export async function getQrCode(ctx: Ctx, qrId: string): Promise<QrCode | null> {
  const codes = await listQrCodes(ctx);
  return codes.find((qr) => qr.id === qrId) ?? null;
}

/**
 * The largest design a code may carry.
 *
 * A logo travels inside the design, as a data URL, so the design is as
 * big as the image in it. The browser checks the size before it sends
 * anything, but the browser is the wrong place to be the only check: the
 * server is what writes the row.
 */
const MAX_DESIGN_BYTES = 256 * 1024;

function assertDesignFits(design: Record<string, unknown> | undefined): void {
  if (!design) return;
  const size = Buffer.byteLength(JSON.stringify(design), "utf8");
  if (size > MAX_DESIGN_BYTES) {
    throw new DataError(
      "That design is too large to save. A logo is limited to 128 KB.",
      "DESIGN_TOO_LARGE",
    );
  }
}

export async function createQrCode(
  ctx: Ctx,
  input: {
    longUrl: string;
    code?: string;
    title?: string;
    design?: Record<string, unknown>;
    linkId?: string | null;
    tags?: string[];
    expiresAt?: string | null;
  },
) {
  await assertCan(ctx, "create");
  assertDesignFits(input.design);
  if (!isValidUrl(input.longUrl)) {
    throw new DataError("That does not look like a valid URL.", "INVALID_URL");
  }
  const domainRows = await client_`
    select d.id from domains d
    join links l on l.domain_id = d.id and l.id = ${input.linkId ?? null}::uuid
    where d.org_id = ${ctx.orgId}
    limit 1
  `;
  let domainId = domainRows[0]?.id;
  if (!domainId) {
    const fallback = await client_`
      select id from domains where org_id = ${ctx.orgId} and kind = 'default' limit 1
    `;
    domainId = fallback[0]?.id;
  }
  if (!domainId) throw new DataError("No domain is set up for this workspace.", "NO_DOMAIN");

  const code = input.code?.trim() || randomCode();
  if (await codeTaken(domainId, code)) {
    throw new DataError(`"${code}" is already taken.`, "CODE_TAKEN");
  }
  const rows = await client_`
    insert into qr_codes (
      org_id, group_id, link_id, domain_id, code, long_url, title, design, tags,
      expires_at, created_by, created_at, updated_at
    ) values (
      ${ctx.orgId}, ${ctx.groupId}, ${input.linkId ?? null}, ${domainId}, ${code},
      ${input.longUrl}, ${input.title?.trim() || null}, ${asJson(input.design ?? {})}::jsonb,
      ${asArray(input.tags ?? [])}, ${input.expiresAt ?? null},
      ${ctx.userId}, now(), now()
    )
    returning *
  `;
  await bumpCounter(ctx, "qr_codes", 1);
  await logActivity(ctx, "qr.created", "qr_code", rows[0]!.id, { code });
  await enqueueWebhook(ctx.orgId, "qr.created", {
    event: "qr.created",
    created_at: new Date().toISOString(),
    qr_code: {
      id: rows[0]!.id,
      code: rows[0]!.code,
      long_url: rows[0]!.long_url,
      title: rows[0]!.title,
    },
  });
  return rows[0]!;
}

export async function updateQrCode(
  ctx: Ctx,
  qrId: string,
  patch: Partial<Pick<QrCode, "title" | "design" | "tags" | "expiresAt" | "longUrl">>,
) {
  await assertCan(ctx, "update");
  if (patch.longUrl !== undefined && !isValidUrl(patch.longUrl)) {
    throw new DataError("That does not look like a valid URL.", "INVALID_URL");
  }
  assertDesignFits(patch.design);
  const rows = await db()
    .update(schema.qrCodes)
    .set({
      ...(patch.title !== undefined ? { title: patch.title?.trim() || null } : {}),
      ...(patch.longUrl !== undefined ? { longUrl: patch.longUrl } : {}),
      ...(patch.design !== undefined ? { design: patch.design } : {}),
      ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
      ...(patch.expiresAt !== undefined
        ? { expiresAt: patch.expiresAt ? new Date(patch.expiresAt) : null }
        : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(schema.qrCodes.id, qrId), eq(schema.qrCodes.orgId, ctx.orgId)))
    .returning();
  if (!rows[0]) throw new DataError("That code no longer exists.", "NOT_FOUND");
  await logActivity(ctx, "qr.updated", "qr_code", qrId, {});
  return rows[0];
}

export async function deleteQrCode(ctx: Ctx, qrId: string) {
  await assertCan(ctx, "delete");
  const rows = await client_`
    delete from qr_codes where id = ${qrId} and org_id = ${ctx.orgId} returning id
  `;
  if (!rows[0]) throw new DataError("That code no longer exists.", "NOT_FOUND");
  await bumpCounter(ctx, "qr_codes", -1);
}

export async function listQrTemplates(ctx: Ctx) {
  return withOrg(ctx.orgId, async () => {
    const rows = await client_`
      select * from qr_code_templates where org_id = ${ctx.orgId} order by name
    `;
    return camelRows(rows);
  });
}

export async function createQrTemplate(ctx: Ctx, name: string, design: Record<string, unknown>) {
  return withOrg(ctx.orgId, async () => {
    await assertCan(ctx, "create");
    const rows = await client_`
      insert into qr_code_templates (org_id, name, design, created_by)
      values (${ctx.orgId}, ${name}, ${asJson(design)}::jsonb, ${ctx.userId})
      on conflict (org_id, name) do update set design = excluded.design, updated_at = now()
      returning *
    `;
    return rows[0]!;
  });
}

export async function deleteQrTemplate(ctx: Ctx, templateId: string) {
  return withOrg(ctx.orgId, async () => {
    await assertCan(ctx, "delete");
    await client_`delete from qr_code_templates where id = ${templateId} and org_id = ${ctx.orgId}`;
  });
}

/* -------------------------------------------------------------------------
 * Pages
 * ------------------------------------------------------------------------- */

export interface PageBlock {
  id: string;
  pageId: string;
  position: number;
  type: string;
  config: Record<string, unknown>;
  url: string | null;
}

export interface Page {
  id: string;
  orgId: string;
  groupId: string;
  title: string;
  slug: string;
  domainId: string | null;
  status: "draft" | "published" | "scheduled";
  appearance: Record<string, unknown>;
  seo: Record<string, unknown>;
  scheduledFor: string | null;
  publishedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  blocks: PageBlock[];
  views: number;
}

export async function listPages(ctx: Ctx) {
  const rows = await client_`
    select p.*, (select count(*) from engagement_events e where e.page_id = p.id and e.event_type = 'page_view') as views
    from pages p where p.org_id = ${ctx.orgId}
    order by p.created_at desc
  `;
  const blocks = await client_`
    select * from page_blocks
    where page_id in (select id from pages where org_id = ${ctx.orgId})
    order by position
  `;
  return rows.map((row) => ({
    id: row.id,
    orgId: row.org_id,
    groupId: row.group_id,
    title: row.title,
    slug: row.slug,
    domainId: row.domain_id,
    status: row.status,
    appearance: row.appearance ?? {},
    seo: row.seo ?? {},
    scheduledFor: row.scheduled_for ? iso(row.scheduled_for) : null,
    publishedAt: row.published_at ? iso(row.published_at) : null,
    createdBy: row.created_by,
    createdAt: isoRequired(row.created_at),
    updatedAt: iso(row.updated_at),
    blocks: camelRows(blocks.filter((block) => block.page_id === row.id)) as PageBlock[],
    views: Number(row.views ?? 0),
  })) as Page[];
}

export async function getPage(ctx: Ctx, pageId: string): Promise<Page | null> {
  const pages = await listPages(ctx);
  return pages.find((page) => page.id === pageId) ?? null;
}

export async function getPageBySlug(slug: string) {
  const rows = await client_`
    select p.* from pages p
    join organization o on o.id = p.org_id
    where p.slug = ${slug} and p.status = 'published'
    limit 1
  `;
  if (!rows[0]) return null;
  const blocks =
    await client_`select * from page_blocks where page_id = ${rows[0].id} order by position`;
  return {
    id: rows[0].id,
    orgId: rows[0].org_id,
    groupId: rows[0].group_id,
    title: rows[0].title,
    slug: rows[0].slug,
    domainId: rows[0].domain_id,
    status: rows[0].status,
    appearance: rows[0].appearance ?? {},
    seo: rows[0].seo ?? {},
    scheduledFor: null,
    publishedAt: rows[0].published_at ? isoRequired(rows[0].published_at) : null,
    createdBy: rows[0].created_by,
    createdAt: isoRequired(rows[0].created_at),
    updatedAt: isoRequired(rows[0].updated_at),
    blocks: blocks as PageBlock[],
    views: 0,
  } as Page;
}

export async function listPageTemplates() {
  const rows = await client_`select * from page_templates order by category, name`;
  return camelRows(rows).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    slug: row.slug,
    content: row.content ?? {},
    isOfficial: row.is_official === true,
  }));
}

export async function createPage(
  ctx: Ctx,
  input: { title: string; slug?: string; templateId?: string },
) {
  await assertCan(ctx, "create");
  if (!input.title.trim()) {
    throw new DataError("Give the page a name.", "TITLE_REQUIRED");
  }
  const wanted = input.slug?.trim() || codeSlug(input.title);
  const taken = await client_`
    select id from pages where org_id = ${ctx.orgId} and slug = ${wanted} limit 1
  `;
  if (taken.length > 0) {
    throw new DataError("That page address is already taken.", "SLUG_TAKEN");
  }
  const rows = await client_`
    insert into pages (org_id, group_id, title, slug, status, appearance, seo, created_by, created_at, updated_at)
    values (
      ${ctx.orgId}, ${ctx.groupId}, ${input.title}, ${wanted},
      'draft', '{"theme":"plain","font":"sans","background":"#ffffff"}'::jsonb, '{}'::jsonb,
      ${ctx.userId}, now(), now()
    )
    returning *
  `;
  const page = rows[0]!;
  if (input.templateId) {
    const template =
      await client_`select content from page_templates where id = ${input.templateId}`;
    const blocks =
      (template[0]?.content as { blocks?: { type: string; config: Record<string, unknown> }[] })
        ?.blocks ?? [];
    for (const [index, block] of blocks.entries()) {
      await client_`
        insert into page_blocks (page_id, position, type, config)
        values (${page.id}, ${index}, ${block.type}, ${asJson(block.config)}::jsonb)
      `;
    }
  }
  await bumpCounter(ctx, "pages", 1);
  await logActivity(ctx, "page.created", "page", page.id, { title: page.title });
  return page;
}

export async function updatePage(
  ctx: Ctx,
  pageId: string,
  patch: Partial<Pick<Page, "title" | "slug" | "appearance" | "seo" | "domainId">>,
) {
  await assertCan(ctx, "update");
  const rows = await db()
    .update(schema.pages)
    .set({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
      ...(patch.appearance !== undefined ? { appearance: patch.appearance } : {}),
      ...(patch.seo !== undefined ? { seo: patch.seo } : {}),
      ...(patch.domainId !== undefined ? { domainId: patch.domainId } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(schema.pages.id, pageId), eq(schema.pages.orgId, ctx.orgId)))
    .returning();
  if (!rows[0]) throw new DataError("That page no longer exists.", "NOT_FOUND");
  return rows[0];
}

export async function deletePage(ctx: Ctx, pageId: string) {
  await assertCan(ctx, "delete");
  const rows =
    await client_`delete from pages where id = ${pageId} and org_id = ${ctx.orgId} returning id`;
  if (!rows[0]) throw new DataError("That page no longer exists.", "NOT_FOUND");
  await bumpCounter(ctx, "pages", -1);
}

export async function addBlock(
  ctx: Ctx,
  pageId: string,
  input: { type: string; config: Record<string, unknown> },
) {
  await assertCan(ctx, "update");
  const position = await client_`
    select coalesce(max(position) + 1, 0) as next from page_blocks where page_id = ${pageId}
  `;
  const rows = await client_`
    insert into page_blocks (page_id, position, type, config)
    values (${pageId}, ${position[0]?.next ?? 0}, ${input.type}, ${asJson(input.config)}::jsonb)
    returning *
  `;
  return rows[0]!;
}

export async function updateBlock(
  ctx: Ctx,
  pageId: string,
  blockId: string,
  patch: Partial<Pick<PageBlock, "config" | "url" | "type">>,
) {
  await assertCan(ctx, "update");
  const rows = await client_`
    update page_blocks set
      config = case when ${patch.config !== undefined} then ${asJson(patch.config)}::jsonb else config end,
      url = case when ${patch.url !== undefined} then ${patch.url} else url end,
      type = case when ${patch.type !== undefined} then ${patch.type} else type end,
      updated_at = now()
    where id = ${blockId} and page_id = ${pageId}
    returning *
  `;
  if (!rows[0]) throw new DataError("That block no longer exists.", "NOT_FOUND");
  return rows[0];
}

export async function removeBlock(ctx: Ctx, pageId: string, blockId: string) {
  await assertCan(ctx, "update");
  await client_`delete from page_blocks where id = ${blockId} and page_id = ${pageId}`;
  const blocks =
    await client_`select id from page_blocks where page_id = ${pageId} order by position`;
  for (const [index, block] of blocks.entries()) {
    await client_`update page_blocks set position = ${index} where id = ${block.id}`;
  }
}

export async function reorderBlocks(ctx: Ctx, pageId: string, orderedIds: string[]) {
  await assertCan(ctx, "update");
  for (const [index, id] of orderedIds.entries()) {
    await client_`update page_blocks set position = ${index} where id = ${id} and page_id = ${pageId}`;
  }
  const rows = await client_`select * from page_blocks where page_id = ${pageId} order by position`;
  return camelRows(rows);
}

export async function setPageStatus(
  ctx: Ctx,
  pageId: string,
  status: "draft" | "published" | "scheduled",
  scheduledFor?: string | null,
) {
  await assertCan(ctx, "update");
  const rows = await client_`
    update pages set
      status = ${status},
      scheduled_for = case when ${status} = 'scheduled' then ${scheduledFor ?? null}::timestamptz else null end,
      published_at = case when ${status} = 'published' then coalesce(published_at, now()) else published_at end,
      updated_at = now()
    where id = ${pageId} and org_id = ${ctx.orgId}
    returning *
  `;
  if (!rows[0]) throw new DataError("That page no longer exists.", "NOT_FOUND");
  await logActivity(ctx, `page.${status}`, "page", pageId, {});
  if (status === "published") {
    await enqueueWebhook(ctx.orgId, "page.published", {
      event: "page.published",
      created_at: new Date().toISOString(),
      page: {
        id: rows[0].id,
        slug: rows[0].slug,
        title: rows[0].title,
      },
    });
  }
  return rows[0];
}

export async function clonePage(ctx: Ctx, pageId: string, title: string) {
  await assertCan(ctx, "create");
  const source = await getPage(ctx, pageId);
  if (!source) throw new DataError("That page no longer exists.", "NOT_FOUND");
  const rows = await client_`
    insert into pages (org_id, group_id, title, slug, status, appearance, seo, created_by, created_at, updated_at)
    values (
      ${ctx.orgId}, ${ctx.groupId}, ${title}, ${`${source.slug}-copy`}, 'draft',
      ${asJson(source.appearance)}::jsonb, ${asJson(source.seo)}::jsonb,
      ${ctx.userId}, now(), now()
    )
    returning *
  `;
  for (const block of source.blocks ?? []) {
    await client_`
      insert into page_blocks (page_id, position, type, config, url)
      values (${rows[0]!.id}, ${block.position}, ${block.type}, ${asJson(block.config)}::jsonb, ${block.url})
    `;
  }
  return rows[0]!;
}

/* -------------------------------------------------------------------------
 * Analytics
 * ------------------------------------------------------------------------- */

export interface Range {
  from: Date;
  to: Date;
}

export function rangeFromDays(days: number): Range {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  return { from, to };
}

export interface SeriesPoint {
  date: string;
  value: number;
}

export interface Breakdown {
  key: string;
  label: string;
  value: number;
  share: number;
}

function _inRange(event: { occurred_at: Date }, range: Range): boolean {
  return event.occurred_at >= range.from && event.occurred_at <= range.to;
}

function matchesMetric(
  event: { event_type: string },
  metric: "engagements" | "clicks" | "scans",
): boolean {
  if (metric === "clicks") return event.event_type === "click";
  if (metric === "scans") return event.event_type === "scan";
  return ["click", "scan", "block_click"].includes(event.event_type);
}

export async function getOverview(
  ctx: Ctx,
  range: Range,
  metric: "engagements" | "clicks" | "scans" = "engagements",
) {
  const rows = await client_`
    select e.* from engagement_events e
    where e.org_id = ${ctx.orgId}
      and e.group_id = ${ctx.groupId}
      and e.occurred_at between ${range.from.toISOString()} and ${range.to.toISOString()}
  `;
  const window = rows.filter((row) => matchesMetric(row, metric));
  const span = range.to.getTime() - range.from.getTime();
  const previous = rows.filter(
    (row) =>
      new Date(row.occurred_at).getTime() >= range.from.getTime() - span &&
      new Date(row.occurred_at).getTime() < range.from.getTime() &&
      matchesMetric(row, metric),
  );

  const dayCount = Math.max(1, Math.round(span / 86_400_000));
  const series: SeriesPoint[] = [];
  for (let i = 0; i < dayCount; i += 1) {
    const day = new Date(range.from.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    series.push({
      date: day,
      value: window.filter((row) => dayOf(row.occurred_at) === day).length,
    });
  }

  const breakdown = (pick: (row: (typeof rows)[number]) => string | null): Breakdown[] => {
    const counts = new Map<string, number>();
    for (const row of window) {
      const key = pick(row);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const total = window.length || 1;
    return [...counts.entries()]
      .map(([key, value]) => ({ key, label: key, value, share: value / total }))
      .sort((a, b) => b.value - a.value);
  };

  const linkTotals = new Map<string, number>();
  for (const row of window) {
    if (!row.link_id) continue;
    linkTotals.set(row.link_id, (linkTotals.get(row.link_id) ?? 0) + 1);
  }

  return {
    total: window.length,
    previousTotal: previous.length,
    series,
    byCountry: breakdown((row) => row.country_code),
    byCity: breakdown((row) => row.city),
    byDevice: breakdown((row) => row.device_type),
    byReferrer: breakdown((row) => row.referrer),
    byOs: breakdown((row) => row.os),
    byBrowser: breakdown((row) => row.browser),
    topLinks: [...linkTotals.entries()]
      .map(([id, value]) => {
        const _link = rows.find((row) => row.link_id === id);
        return { id, code: "", title: null as string | null, value };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
  };
}

export async function getLinkMetrics(
  ctx: Ctx,
  linkId: string,
  range: Range,
  metric: "engagements" | "clicks" | "scans" = "engagements",
) {
  const rows = await client_`
    select e.* from engagement_events e
    where e.org_id = ${ctx.orgId}
      and (e.link_id = ${linkId} or e.qr_code_id in (select id from qr_codes where link_id = ${linkId}))
      and e.occurred_at between ${range.from.toISOString()} and ${range.to.toISOString()}
  `;
  const events = rows.filter((row) => matchesMetric(row, metric));
  const dayCount = Math.max(
    1,
    Math.round((range.to.getTime() - range.from.getTime()) / 86_400_000),
  );
  const series: SeriesPoint[] = [];
  for (let i = 0; i < dayCount; i += 1) {
    const day = new Date(range.from.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    series.push({
      date: day,
      value: events.filter((row) => dayOf(row.occurred_at) === day).length,
    });
  }
  const counts = (pick: (row: (typeof rows)[number]) => string | null) => {
    const map = new Map<string, number>();
    for (const row of events) {
      const key = pick(row);
      if (key) map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  };
  return {
    total: events.length,
    series,
    byCountry: counts((row) => row.country_code),
    byCity: counts((row) => row.city),
    byDevice: counts((row) => row.device_type),
    byReferrer: counts((row) => row.referrer),
    byOs: counts((row) => row.os),
    byBrowser: counts((row) => row.browser),
  };
}

export async function getQrMetrics(ctx: Ctx, qrId: string, range: Range) {
  const rows = await client_`
    select e.* from engagement_events e
    where e.org_id = ${ctx.orgId} and e.qr_code_id = ${qrId}
      and e.occurred_at between ${range.from.toISOString()} and ${range.to.toISOString()}
  `;
  const dayCount = Math.max(
    1,
    Math.round((range.to.getTime() - range.from.getTime()) / 86_400_000),
  );
  const series: SeriesPoint[] = [];
  for (let i = 0; i < dayCount; i += 1) {
    const day = new Date(range.from.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    series.push({ date: day, value: rows.filter((row) => dayOf(row.occurred_at) === day).length });
  }
  const counts = (pick: (row: (typeof rows)[number]) => string | null) => {
    const map = new Map<string, number>();
    for (const row of rows) {
      const key = pick(row);
      if (key) map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  };
  return {
    total: rows.length,
    series,
    byCountry: counts((row) => row.country_code),
    byCity: counts((row) => row.city),
    byDevice: counts((row) => row.device_type),
    byOs: counts((row) => row.os),
    byBrowser: counts((row) => row.browser),
  };
}

export async function getPageMetrics(ctx: Ctx, pageId: string, range: Range) {
  const rows = await client_`
    select e.* from engagement_events e
    where e.org_id = ${ctx.orgId} and e.page_id = ${pageId}
      and e.occurred_at between ${range.from.toISOString()} and ${range.to.toISOString()}
  `;
  const blocks =
    await client_`select * from page_blocks where page_id = ${pageId} order by position`;
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.page_block_id) continue;
    counts.set(row.page_block_id, (counts.get(row.page_block_id) ?? 0) + 1);
  }
  return {
    views: rows.filter((row) => row.event_type === "page_view").length,
    clicks: rows.filter((row) => row.event_type === "block_click").length,
    downloads: rows.filter((row) => row.event_type === "card_download").length,
    topBlocks: blocks
      .map((block) => ({
        id: block.id,
        title: String(block.config.title ?? block.config.heading ?? block.type),
        clicks: counts.get(block.id) ?? 0,
      }))
      .sort((a, b) => b.clicks - a.clicks),
  };
}

export async function getWeeklyInsights(ctx: Ctx) {
  const rows = await client_`
    select * from engagement_events e
    where e.org_id = ${ctx.orgId} and e.occurred_at > now() - interval '14 days'
  `;
  const week = rows.filter(
    (row) => new Date(row.occurred_at).getTime() > Date.now() - 7 * 86_400_000,
  );
  const last = rows.filter(
    (row) => new Date(row.occurred_at).getTime() <= Date.now() - 7 * 86_400_000,
  );
  const byReferrer = new Map<string, number>();
  for (const row of week) {
    if (!row.referrer) continue;
    byReferrer.set(row.referrer, (byReferrer.get(row.referrer) ?? 0) + 1);
  }
  const top = [...byReferrer.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const delta =
    last.length === 0 ? 100 : Math.round(((week.length - last.length) / last.length) * 100);
  return {
    total: week.length,
    previousTotal: last.length,
    delta,
    topReferrers: top.map(([label, value]) => ({ label, value })),
    summary:
      week.length === 0
        ? "No clicks in the last seven days yet."
        : `Clicks came ${delta >= 0 ? "up" : "down"} ${Math.abs(delta)}% week over week, led by ${top[0]?.[0] ?? "direct traffic"}.`,
  };
}

export async function getTopLinks(ctx: Ctx, range: Range, limit = 10) {
  const overview = await getOverview(ctx, range);
  return overview.topLinks.slice(0, limit);
}

export async function getChannelMetrics(ctx: Ctx, channelId: string, range: Range) {
  return withOrg(ctx.orgId, async () => {
    const rows = await client_`
      select l.id, l.code, l.title, count(e.id)::int as clicks
      from links l
      left join engagement_events e on e.link_id = l.id
        and e.occurred_at between ${range.from.toISOString()} and ${range.to.toISOString()}
      where l.channel_id = ${channelId} and l.org_id = ${ctx.orgId}
      group by l.id, l.code, l.title
      order by clicks desc
    `;
    const total = rows.reduce((sum, row) => sum + row.clicks, 0);
    return { total, links: rows };
  });
}

/* -------------------------------------------------------------------------
 * Campaigns and channels
 * ------------------------------------------------------------------------- */

export async function listCampaigns(ctx: Ctx) {
  return withOrg(ctx.orgId, async () => {
    const campaigns = await client_`
      select * from campaigns where org_id = ${ctx.orgId} order by created_at desc
    `;
    const channels = await client_`select * from channels where org_id = ${ctx.orgId}`;
    const links = await client_`
      select id, campaign_id, click_count from links where org_id = ${ctx.orgId}
    `;
    return campaigns.map((campaign) => {
      const own = links.filter((link) => link.campaign_id === campaign.id);
      return {
        id: campaign.id,
        orgId: campaign.org_id,
        groupId: campaign.group_id,
        name: campaign.name,
        createdAt: isoRequired(campaign.created_at),
        channels: channels
          .filter((channel) => channel.campaign_id === campaign.id)
          .map((channel) => ({
            id: channel.id,
            orgId: channel.org_id,
            campaignId: channel.campaign_id,
            name: channel.name,
            createdAt: isoRequired(channel.created_at),
          })),
        linkCount: own.length,
        clicks: own.reduce((sum, link) => sum + link.click_count, 0),
      };
    });
  });
}

export async function createCampaign(ctx: Ctx, name: string, channels: string[]) {
  // The same channel twice is one channel. The dialog starts with the
  // workspace's channels already in the field, so a repeat is easy to
  // produce and is not a mistake a person should be shown: it used to
  // arrive as a unique violation on (campaign_id, name).
  const wanted = [...new Set(channels.map((channel) => channel.trim()).filter(Boolean))];
  const title = name.trim();
  return withOrg(ctx.orgId, async () => {
    await assertCan(ctx, "create");
    // The create button sits in the dialog's footer, outside the form, so
    // the input's `required` never runs. An empty name reached the database
    // and made a campaign with nothing written on it.
    if (!title) throw new DataError("A campaign needs a name.", "NO_NAME");
    if (!wanted.length)
      throw new DataError("A campaign needs at least one channel.", "NO_CHANNELS");

    // The campaign and its channels are one write. A campaign that lost its
    // channels to a failed insert is not a campaign anybody asked for, and
    // `client_` gives every statement a transaction of its own.
    const campaign = await inOneTransaction(ctx.orgId, async (tx) => {
      const rows = await tx`
        insert into campaigns (org_id, group_id, name, created_by)
        values (${ctx.orgId}, ${ctx.groupId}, ${title}, ${ctx.userId})
        returning *
      `;
      for (const channel of wanted) {
        await tx`
          insert into channels (org_id, campaign_id, name)
          values (${ctx.orgId}, ${rows[0]!.id}, ${channel})
        `;
      }
      return rows[0]!;
    });

    await logActivity(ctx, "campaign.created", "campaign", campaign.id, { name: title });
    await enqueueWebhook(ctx.orgId, "campaign.created", {
      event: "campaign.created",
      created_at: new Date().toISOString(),
      campaign: { id: campaign.id, name: campaign.name },
    });
    return campaign;
  });
}

export async function updateCampaign(ctx: Ctx, campaignId: string, name: string) {
  return withOrg(ctx.orgId, async () => {
    await assertCan(ctx, "update");
    const rows = await client_`
      update campaigns set name = ${name}, updated_at = now()
      where id = ${campaignId} and org_id = ${ctx.orgId}
      returning *
    `;
    if (!rows[0]) throw new DataError("That campaign no longer exists.", "NOT_FOUND");
    return rows[0];
  });
}

export async function deleteCampaign(ctx: Ctx, campaignId: string) {
  return withOrg(ctx.orgId, async () => {
    await assertCan(ctx, "delete");
    await client_`delete from campaigns where id = ${campaignId} and org_id = ${ctx.orgId}`;
  });
}

export async function listChannels(ctx: Ctx) {
  return withOrg(ctx.orgId, async () => {
    const rows = await client_`select * from channels where org_id = ${ctx.orgId} order by name`;
    return camelRows(rows);
  });
}

export async function listUtmPresets(ctx: Ctx) {
  return withOrg(ctx.orgId, async () => {
    const rows = await client_`select * from utm_presets where org_id = ${ctx.orgId} order by name`;
    return camelRows(rows);
  });
}

export async function saveUtmPreset(ctx: Ctx, name: string, params: Record<string, string>) {
  return withOrg(ctx.orgId, async () => {
    await assertCan(ctx, "create");
    const rows = await client_`
      insert into utm_presets (org_id, name, params)
      values (${ctx.orgId}, ${name}, ${asJson(params)}::jsonb)
      on conflict (org_id, name) do update set params = excluded.params, updated_at = now()
      returning *
    `;
    return rows[0]!;
  });
}

/* -------------------------------------------------------------------------
 * Domains
 * ------------------------------------------------------------------------- */

export interface Domain {
  id: string;
  orgId: string | null;
  host: string;
  kind: "default" | "custom" | "bsd";
  isActive: boolean;
  dnsRecords: { type: string; name: string; value: string }[];
  verificationStatus: "pending" | "verified" | "failed";
  verifiedAt: string | null;
  lastDnsCheckAt: string | null;
  createdAt: string;
}

export async function listDomains(ctx: Ctx): Promise<Domain[]> {
  const rows = await client_`
    select * from domains
    where org_id = ${ctx.orgId} or org_id is null
    order by (kind = 'default') desc, kind, host
  `;
  return rows.map((row) => ({
    id: row.id,
    orgId: row.org_id,
    host: row.host,
    kind: row.kind,
    isActive: row.is_active,
    dnsRecords: row.dns_records ?? [],
    verificationStatus: row.verification_status,
    verifiedAt: row.verified_at ? iso(row.verified_at) : null,
    lastDnsCheckAt: row.last_dns_check_at ? iso(row.last_dns_check_at) : null,
    createdAt: isoRequired(row.created_at),
  }));
}

export async function addDomain(ctx: Ctx, host: string) {
  await assertCan(ctx, "create");
  const clean = host
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(clean)) {
    throw new DataError("That does not look like a domain name.", "INVALID_DOMAIN");
  }
  const existing = await client_`select id from domains where host = ${clean}`;
  if (existing.length) throw new DataError("That domain is already added.", "DOMAIN_EXISTS");
  // The token is what proves the domain is yours. It is per domain, so a
  // token cannot be copied from one domain to another.
  const token = `steadlink-verify=${randomBytes(12).toString("hex")}`;
  const records = [
    { type: "CNAME", name: "go", value: "proxy.steadlink.dev" },
    { type: "TXT", name: "_steadlink", value: token },
  ];
  const rows = await client_`
    insert into domains (org_id, host, kind, dns_records, verification_status)
    values (${ctx.orgId}, ${clean}, 'custom', ${asJson(records)}::jsonb, 'pending')
    returning *
  `;
  await logActivity(ctx, "domain.added", "domain", rows[0]!.id, { host: clean });
  return rows[0]!;
}

export async function verifyDomain(ctx: Ctx, domainId: string) {
  await assertCan(ctx, "update");
  const existing = await client_`
    select * from domains where id = ${domainId} and org_id = ${ctx.orgId} limit 1
  `;
  if (!existing[0]) throw new DataError("That domain no longer exists.", "NOT_FOUND");
  const domain = existing[0];

  // Ask the resolver what is actually published. A domain that has not
  // been set up yet has no records, and that is a normal answer.
  const records = (domain.dns_records ?? []) as DnsRecord[];
  const result = await checkDnsRecords(domain.host, records);

  const rows = await client_`
    update domains set
      verification_status = ${result.verified ? "verified" : "pending"},
      last_dns_check_at = now()
    where id = ${domainId} and org_id = ${ctx.orgId}
    returning *
  `;
  await logActivity(ctx, "domain.verified", "domain", domainId, {
    host: domain.host,
    verified: result.verified,
  });
  return { ...rows[0]!, dnsCheck: result };
}

export async function removeDomain(ctx: Ctx, domainId: string) {
  await assertCan(ctx, "delete");
  const inUse = await client_`select id from links where domain_id = ${domainId} limit 1`;
  if (inUse.length) {
    throw new DataError("Move the links off that domain first.", "DOMAIN_IN_USE");
  }
  await client_`delete from domains where id = ${domainId} and org_id = ${ctx.orgId}`;
}

/* -------------------------------------------------------------------------
 * Settings, tokens, webhooks
 * ------------------------------------------------------------------------- */

export async function getProfile(ctx: Ctx) {
  const user = await client_`select * from "user" where id = ${ctx.userId}`;
  const org = await client_`select * from organization where id = ${ctx.orgId}`;
  const members = await client_`
    select m.*, u.name, u.email from member m
    join "user" u on u.id = m.user_id
    where m.organization_id = ${ctx.orgId}
  `;
  const groups = await client_`select * from groups where org_id = ${ctx.orgId}`;
  return {
    user: user[0] ?? null,
    org: org[0] ?? null,
    members: members.map((member) => ({
      userId: member.user_id,
      orgId: member.organization_id,
      role: member.role,
      createdAt: isoRequired(member.created_at),
      user: { id: member.user_id, name: member.name, email: member.email },
    })),
    groups: groups.map((group) => ({
      id: group.id,
      orgId: group.org_id,
      name: group.name,
      slug: group.slug,
      isDefault: group.is_default,
    })),
  };
}

export async function updateProfile(
  ctx: Ctx,
  patch: { displayName?: string; timezone?: string; locale?: string },
) {
  return withOrg(ctx.orgId, async () => {
    await assertCan(ctx, "update");
    if (patch.displayName !== undefined) {
      await client_`update "user" set name = ${patch.displayName}, updated_at = now() where id = ${ctx.userId}`;
    }
    if (patch.timezone !== undefined) {
      await client_`update org_settings set timezone = ${patch.timezone}, updated_at = now() where org_id = ${ctx.orgId}`;
    }
    const user = await client_`select * from "user" where id = ${ctx.userId}`;
    return user[0]!;
  });
}

export async function getUsage(ctx: Ctx) {
  return withOrg(ctx.orgId, async () => {
    const plan = await getPlan();
    const counters = await client_`select * from organization_counters where org_id = ${ctx.orgId}`;
    const count = counters[0];
    return {
      plan,
      usage: {
        links: count?.links_count ?? 0,
        qrCodes: count?.qr_codes_count ?? 0,
        pages: count?.pages_count ?? 0,
        backHalves: count?.custom_back_halves_count ?? 0,
      },
    };
  });
}

export interface ApiKey {
  id: string;
  name: string | null;
  prefix: string | null;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
  orgId: string | null;
  userId: string | null;
}

export async function listApiKeys(ctx: Ctx): Promise<ApiKey[]> {
  const rows = await client_`
    select id, name, start, prefix, permissions, last_request, created_at, org_id, user_id
    from apikey where org_id = ${ctx.orgId} or user_id = ${ctx.userId}
    order by created_at desc
  `;
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    prefix: row.start ?? row.prefix,
    scopes: readScopes(row.permissions),
    lastUsedAt: iso(row.last_request),
    createdAt: isoRequired(row.created_at),
    orgId: row.org_id,
    userId: row.user_id,
  }));
}

/**
 * The digest the API key plugin stores.
 *
 * The plugin hashes a token with SHA-256 and keeps the digest, so a copy
 * of the database does not hand out working tokens. A token we mint has to
 * be hashed the same way, or the plugin will not recognise it.
 */
export function hashApiKey(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

export async function createApiKey(ctx: Ctx, name: string, scopes: string[]) {
  await assertCan(ctx, "manage_tokens");
  // 32 random characters from an alphabet with no ambiguous glyphs.
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = randomBytes(32);
  let body = "";
  for (const byte of bytes) body += alphabet[byte % alphabet.length];
  const token = `gl_${body}`;

  const rows = await client_`
    insert into apikey (
      config_id, name, start, reference_id, prefix, key, user_id, org_id,
      permissions, enabled, rate_limit_enabled, rate_limit_time_window, rate_limit_max
    ) values (
      'default', ${name}, ${token.slice(0, 6)}, ${ctx.orgId}, 'gl', ${hashApiKey(token)},
      ${ctx.userId}, ${ctx.orgId}, ${permissionsFor(scopes)}, true, true,
      ${60 * 60 * 1000}, ${1000}
    )
    returning id, name, start, prefix, permissions, last_request, created_at, org_id, user_id
  `;
  await logActivity(ctx, "api_key.created", "api_key", rows[0]!.id, { name });
  return {
    id: rows[0]!.id,
    name: rows[0]!.name,
    prefix: rows[0]!.start,
    scopes,
    lastUsedAt: null,
    createdAt: isoRequired(rows[0]!.created_at),
    orgId: rows[0]!.org_id,
    userId: rows[0]!.user_id,
    // The only time the token itself is ever available.
    token,
  };
}

/**
 * Who a token acts for.
 *
 * The API key plugin owns the token: it decides whether one is valid,
 * whether it has expired, and whether it has run out of calls. It does not
 * know about the workspace columns we keep alongside, so this reads them.
 */
export interface ApiKeyContext {
  id: string;
  name: string | null;
  orgId: string | null;
  userId: string | null;
  scopes: string[];
}

export async function getApiKeyContext(keyId: string): Promise<ApiKeyContext | null> {
  const rows = await client_`
    select id, name, org_id, user_id, permissions
    from apikey where id = ${keyId} limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    orgId: row.org_id,
    userId: row.user_id,
    scopes: readScopes(row.permissions),
  };
}

export async function revokeApiKey(ctx: Ctx, keyId: string) {
  await assertCan(ctx, "manage_tokens");
  await client_`delete from apikey where id = ${keyId} and (org_id = ${ctx.orgId} or user_id = ${ctx.userId})`;
}

export async function listWebhooks(ctx: Ctx) {
  return withOrg(ctx.orgId, async () => {
    const rows = await client_`
      select * from webhooks where org_id = ${ctx.orgId} order by created_at desc
    `;
    return camelRows(rows);
  });
}

export async function createWebhook(
  ctx: Ctx,
  input: { name: string; event: string; url: string; authType: string },
) {
  return withOrg(ctx.orgId, async () => {
    await assertCan(ctx, "manage_webhooks");
    let parsed: URL;
    try {
      parsed = new URL(input.url);
    } catch {
      throw new DataError("That webhook URL is not valid.", "INVALID_URL");
    }
    if (parsed.protocol !== "https:") {
      throw new DataError("Webhook URLs must use HTTPS.", "INSECURE_URL");
    }
    const rows = await client_`
      insert into webhooks (org_id, name, event, url, secret, auth_type)
      values (${ctx.orgId}, ${input.name}, ${input.event}, ${input.url}, ${`whsec_${Math.random().toString(36).slice(2, 14)}`}, ${input.authType})
      returning *
    `;
    await logActivity(ctx, "webhook.created", "webhook", rows[0]!.id, { name: input.name });
    return rows[0]!;
  });
}

export async function updateWebhook(ctx: Ctx, webhookId: string, patch: Record<string, unknown>) {
  return withOrg(ctx.orgId, async () => {
    await assertCan(ctx, "manage_webhooks");
    const rows = await client_`
      update webhooks set
        name = coalesce(${patch.name ?? null}, name),
        event = coalesce(${patch.event ?? null}, event),
        url = coalesce(${patch.url ?? null}, url),
        is_active = coalesce(${patch.isActive ?? null}, is_active),
        fetch_tags = coalesce(${patch.fetchTags ?? null}, fetch_tags),
        updated_at = now()
      where id = ${webhookId} and org_id = ${ctx.orgId}
      returning *
    `;
    if (!rows[0]) throw new DataError("That webhook no longer exists.", "NOT_FOUND");
    return rows[0];
  });
}

export async function deleteWebhook(ctx: Ctx, webhookId: string) {
  return withOrg(ctx.orgId, async () => {
    await assertCan(ctx, "manage_webhooks");
    await client_`delete from webhooks where id = ${webhookId} and org_id = ${ctx.orgId}`;
  });
}

export async function verifyWebhook(ctx: Ctx, webhookId: string) {
  return withOrg(ctx.orgId, async () => {
    await assertCan(ctx, "manage_webhooks");
    const rows =
      await client_`select last_status from webhooks where id = ${webhookId} and org_id = ${ctx.orgId}`;
    const status = rows[0]?.last_status ?? 0;
    return { ok: status === 200, status };
  });
}

/**
 * Put a delivery in the queue for every webhook that asked for this event.
 *
 * The queue is a table and the worker that empties it is another
 * process, so nothing here talks to the subscriber. A webhook that is
 * slow, broken or gone must not slow down a click, and a failure to
 * queue must not undo the thing that happened — so the write is made on
 * its own and a failure is logged rather than raised.
 */
async function enqueueWebhook(
  orgId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    // The webhooks are a workspace's own rows, so the query has to run
    // inside that workspace's scope. Without it the policies hide every
    // webhook, and the queue stays empty for a reason nobody can see.
    await withOrg(orgId, async () => {
      await client_`
        insert into webhook_deliveries (webhook_id, event_id, event_type, payload, status)
        select w.id, gen_random_uuid(), ${eventType}, ${asJson(payload)}::jsonb, 'pending'
        from webhooks w
        where w.org_id = ${orgId} and w.is_active and w.event = ${eventType}
      `;
    });
  } catch (error) {
    console.error("[steadlink] a webhook delivery could not be queued", error);
  }
}

/** What a subscriber is told about a link. */
function linkPayload(link: {
  id: string;
  code: string;
  long_url?: string | null;
  title?: string | null;
  host?: string | null;
}) {
  return {
    id: link.id,
    code: link.code,
    long_url: link.long_url ?? null,
    title: link.title ?? null,
    domain: link.host ?? null,
  };
}

export async function listWebhookDeliveries(ctx: Ctx) {
  return withOrg(ctx.orgId, async () => {
    const rows = await client_`
      select d.* from webhook_deliveries d
      join webhooks w on w.id = d.webhook_id
      where w.org_id = ${ctx.orgId}
      order by d.created_at desc
      limit 100
    `;
    return camelRows(rows);
  });
}

export async function listActivity(ctx: Ctx, limit = 50) {
  return withOrg(ctx.orgId, async () => {
    const rows = await client_`
      select * from activity_log where org_id = ${ctx.orgId}
      order by created_at desc limit ${limit}
    `;
    return camelRows(rows);
  });
}

export interface BulkUpload {
  id: string;
  orgId: string;
  filename: string;
  status: "queued" | "parsing" | "processing" | "completed" | "failed" | "partial";
  rowCount: number;
  successCount: number;
  errorCount: number;
  errors: { row: number; code: string; message: string }[];
  results: { code: string; longUrl: string }[];
  createdAt: string;
  completedAt: string | null;
}

export async function listBulkUploads(ctx: Ctx): Promise<BulkUpload[]> {
  return withOrg(ctx.orgId, async () => {
    const rows = await client_`
      select * from bulk_uploads where org_id = ${ctx.orgId}
      order by created_at desc
    `;
    return rows.map((row) => ({
      id: row.id,
      orgId: row.org_id,
      filename: row.filename,
      status: row.status,
      rowCount: row.row_count,
      successCount: row.success_count,
      errorCount: row.error_count,
      errors: row.errors ?? [],
      results: row.results ?? [],
      createdAt: isoRequired(row.created_at),
      completedAt: row.completed_at ? iso(row.completed_at) : null,
    }));
  });
}

export async function getBulkUpload(ctx: Ctx, uploadId: string) {
  return withOrg(ctx.orgId, async () => {
    const rows =
      await client_`select * from bulk_uploads where id = ${uploadId} and org_id = ${ctx.orgId}`;
    return rows[0] ?? null;
  });
}

export async function createBulkUpload(
  ctx: Ctx,
  filename: string,
  rows: { longUrl: string; code?: string; title?: string; tags?: string[] }[],
) {
  return withOrg(ctx.orgId, async () => {
    await assertCan(ctx, "create");
    const created = await client_`
      insert into bulk_uploads (org_id, group_id, filename, status, row_count, created_by)
      values (${ctx.orgId}, ${ctx.groupId}, ${filename}, 'processing', ${rows.length}, ${ctx.userId})
      returning *
    `;
    const errors: { row: number; code: string; message: string }[] = [];
    const results: { code: string; longUrl: string }[] = [];
    for (const [index, row] of rows.entries()) {
      try {
        const link = await createLink(ctx, {
          longUrl: row.longUrl,
          code: row.code,
          title: row.title,
          tags: row.tags,
        });
        results.push({ code: link.code, longUrl: row.longUrl });
      } catch (error) {
        errors.push({
          row: index + 1,
          code: error instanceof DataError ? error.code : "UNKNOWN",
          message: (error as Error).message,
        });
      }
    }
    const finished = await client_`
      update bulk_uploads set
        status = ${errors.length ? (results.length ? "partial" : "failed") : "completed"}::text,
        success_count = ${results.length},
        error_count = ${errors.length},
        errors = ${asJson(errors)}::jsonb,
        results = ${asJson(results)}::jsonb,
        completed_at = now()
      where id = ${created[0]!.id}
      returning *
    `;
    return finished[0]!;
  });
}

export async function getAiSettings(ctx: Ctx) {
  return withOrg(ctx.orgId, async () => {
    const rows = await client_`select * from ai_settings where org_id = ${ctx.orgId}`;
    const row = rows[0];
    if (!row) return { provider: "none", baseUrl: null, model: null, enabled: false };
    const [settings] = camelRows([row]);
    if (!settings) return { provider: "none", baseUrl: null, model: null, enabled: false };
    return {
      provider: settings.provider,
      baseUrl: settings.base_url ?? null,
      model: settings.model ?? null,
      enabled: settings.enabled === true,
    };
  });
}

export async function saveAiSettings(
  ctx: Ctx,
  settings: { provider: string; baseUrl: string | null; model: string | null; enabled: boolean },
) {
  return withOrg(ctx.orgId, async () => {
    await assertCan(ctx, "update");
    const rows = await client_`
      insert into ai_settings (org_id, provider, base_url, model, enabled)
      values (${ctx.orgId}, ${settings.provider}, ${settings.baseUrl}, ${settings.model}, ${settings.enabled})
      on conflict (org_id) do update set
        provider = excluded.provider, base_url = excluded.base_url,
        model = excluded.model, enabled = excluded.enabled, updated_at = now()
      returning *
    `;
    return rows[0]!;
  });
}

export async function getUsers(ctx: Ctx) {
  const members = await client_`
    select m.*, u.name, u.email from member m
    join "user" u on u.id = m.user_id
    where m.organization_id = ${ctx.orgId}
  `;
  return members.map((member) => ({
    userId: member.user_id,
    orgId: member.organization_id,
    role: member.role,
    createdAt: isoRequired(member.created_at),
    user: { id: member.user_id, name: member.name, email: member.email },
  }));
}

export async function getGroups(ctx: Ctx): Promise<Group[]> {
  const groups =
    await client_`select * from groups where org_id = ${ctx.orgId} order by created_at`;
  return groups.map((group) => ({
    id: group.id,
    orgId: group.org_id,
    name: group.name,
    slug: group.slug,
    isDefault: group.is_default,
  }));
}

/** The group slugs are unique inside a workspace, and used in URLs. */
function groupSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  if (!slug) throw new DataError("That name has no letters or numbers in it.", "INVALID_NAME");
  return slug;
}

export async function createGroup(ctx: Ctx, name: string, slug?: string) {
  await assertCan(ctx, "update");
  const trimmed = name.trim();
  if (!trimmed) throw new DataError("A group needs a name.", "INVALID_NAME");
  const wanted = slug?.trim() || groupSlug(trimmed);

  const clash = await client_`
    select id from groups where org_id = ${ctx.orgId} and slug = ${wanted} limit 1
  `;
  if (clash.length > 0) {
    throw new DataError("That group name is already taken.", "SLUG_TAKEN");
  }

  const rows = await client_`
    insert into groups (org_id, name, slug, is_default)
    values (${ctx.orgId}, ${trimmed}, ${wanted}, false)
    returning id, org_id, name, slug, is_default, created_at
  `;
  const group = rows[0]!;
  await logActivity(ctx, "group.created", "group", group.id, { name: trimmed });
  return {
    id: group.id,
    orgId: group.org_id,
    name: group.name,
    slug: group.slug,
    isDefault: group.is_default,
    createdAt: isoRequired(group.created_at),
  };
}

export async function updateGroup(
  ctx: Ctx,
  groupId: string,
  patch: { name?: string; slug?: string },
) {
  await assertCan(ctx, "update");
  const existing = await client_`
    select id, name, slug, is_default from groups
    where id = ${groupId} and org_id = ${ctx.orgId} limit 1
  `;
  if (existing.length === 0) throw new DataError("That group does not exist.", "NOT_FOUND");
  const group = existing[0]!;

  const name = patch.name?.trim() || group.name;
  const slug = patch.slug?.trim() || group.slug;
  if (slug !== group.slug) {
    const clash = await client_`
      select id from groups where org_id = ${ctx.orgId} and slug = ${slug} and id <> ${groupId} limit 1
    `;
    if (clash.length > 0) {
      throw new DataError("That group name is already taken.", "SLUG_TAKEN");
    }
  }

  const rows = await client_`
    update groups set name = ${name}, slug = ${slug}, updated_at = now()
    where id = ${groupId} and org_id = ${ctx.orgId}
    returning id, org_id, name, slug, is_default, created_at
  `;
  const updated = rows[0]!;
  await logActivity(ctx, "group.updated", "group", groupId, { name });
  return {
    id: updated.id,
    orgId: updated.org_id,
    name: updated.name,
    slug: updated.slug,
    isDefault: updated.is_default,
    createdAt: isoRequired(updated.created_at),
  };
}

export async function deleteGroup(ctx: Ctx, groupId: string) {
  await assertCan(ctx, "delete");
  const existing = await client_`
    select id, is_default from groups where id = ${groupId} and org_id = ${ctx.orgId} limit 1
  `;
  if (existing.length === 0) throw new DataError("That group does not exist.", "NOT_FOUND");
  if (existing[0]!.is_default) {
    throw new DataError("The default group cannot be removed.", "GROUP_IS_DEFAULT");
  }
  // The links move to the default group rather than disappearing with it.
  await client_`
    update links set group_id = (
      select id from groups where org_id = ${ctx.orgId} and is_default limit 1
    ) where group_id = ${groupId} and org_id = ${ctx.orgId}
  `;
  await client_`delete from groups where id = ${groupId} and org_id = ${ctx.orgId}`;
  await logActivity(ctx, "group.deleted", "group", groupId, {});
}

/* -------------------------------------------------------------------------
 * Search
 * ------------------------------------------------------------------------- */

export interface SearchHit {
  id: string;
  code: string;
  title: string | null;
  longUrl: string;
  tags: string[];
  archivedAt: string | null;
  hiddenAt: string | null;
  expiresAt: string | null;
  clickCount: number;
}

export async function search(
  ctx: Ctx,
  query: string,
): Promise<{
  links: SearchHit[];
  qrCodes: SearchHit[];
}> {
  const needle = query.trim().toLowerCase();
  if (!needle) return { links: [], qrCodes: [] };
  const links = await client_`
    select * from links
    where org_id = ${ctx.orgId} and archived_at is null
      and group_id = ${ctx.groupId}
      and (lower(code) like ${`%${needle}%`}
        or lower(coalesce(title,'')) like ${`%${needle}%`}
        or lower(long_url) like ${`%${needle}%`}
        or ${needle} = any(tags))
    limit 20
  `;
  const qrCodes = await client_`
    select * from qr_codes
    where org_id = ${ctx.orgId} and archived_at is null
      and group_id = ${ctx.groupId}
      and (lower(code) like ${`%${needle}%`} or lower(coalesce(title,'')) like ${`%${needle}%`})
    limit 10
  `;
  return {
    links: links.map((link) => ({
      id: link.id,
      code: link.code,
      title: link.title,
      longUrl: link.long_url,
      tags: link.tags ?? [],
      archivedAt: link.archived_at ? iso(link.archived_at) : null,
      hiddenAt: link.hidden_at ? iso(link.hidden_at) : null,
      expiresAt: link.expires_at ? iso(link.expires_at) : null,
      clickCount: link.click_count,
    })),
    qrCodes: qrCodes.map((qr) => ({
      id: qr.id,
      code: qr.code,
      title: qr.title,
      longUrl: qr.long_url,
      tags: qr.tags ?? [],
      archivedAt: qr.archived_at ? iso(qr.archived_at) : null,
      hiddenAt: null,
      expiresAt: qr.expires_at ? iso(qr.expires_at) : null,
      clickCount: 0,
    })),
  };
}

/* -------------------------------------------------------------------------
 * Redirect
 * ------------------------------------------------------------------------- */

export type RedirectResult =
  | { kind: "redirect"; longUrl: string; linkId: string; qrCodeId: string | null }
  | { kind: "expired" | "archived" | "not_found" };

/**
 * Resolve a short code. This is on the hot path, so it is one query and no
 * joins.
 */
/**
 * Resolve a back-half to the link it points at.
 *
 * The host matters. Every workspace has its own domain, and two workspaces
 * can use the same back-half on their own domain, so a code on its own is
 * not an address. Without the host the first link with that code in the
 * database wins, and the other workspace's link is unreachable.
 */
export async function resolveRedirect(code: string, host?: string): Promise<RedirectResult> {
  const clean = host ? host.split(":")[0]!.toLowerCase() : null;
  const rows = await client_`
    select
      l.id as link_id, l.long_url, l.archived_at, l.expires_at,
      q.id as qr_id, q.long_url as qr_long_url
    from links l
    join domains d on d.id = l.domain_id
    left join qr_codes q on q.code = l.code and q.domain_id = l.domain_id
    where l.code = ${code}
      and (${clean}::text is null or d.host = ${clean})
    order by (${clean}::text is not null and d.host = ${clean}) desc, d.host
    limit 1
  `;
  const row = rows[0];
  if (!row) return { kind: "not_found" };
  if (row.archived_at) return { kind: "archived" };
  // The driver may hand the timestamp back as a string and not as a Date:
  // Drizzle's postgres-js driver replaces the type parsers for timestamps
  // with a pass-through, and it shares the client with this layer. So the
  // value is read as a date rather than assumed to be one.
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return { kind: "expired" };
  }
  return {
    kind: "redirect",
    longUrl: row.long_url,
    linkId: row.link_id,
    qrCodeId: row.qr_id,
  };
}

export interface LinkCheck {
  code: string;
  host: string | null;
  longUrl: string | null;
  title: string | null;
  status: "active" | "archived" | "expired" | "not_found";
  createdAt: string | null;
}

/**
 * Where does a short link point?
 *
 * The answer is for whoever is holding the link, so it works without an
 * account. A person can paste the whole address or just the back-half;
 * when there is a host in it, the code is looked for on that host, which
 * is the same rule the redirect itself uses.
 */
export async function checkLink(raw: string): Promise<LinkCheck> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      code: "",
      host: null,
      longUrl: null,
      title: null,
      status: "not_found",
      createdAt: null,
    };
  }

  // A full address: the host is part of the question. A bare code is not,
  // so any code of that name will do.
  let host: string | null = null;
  let code = trimmed;
  if (trimmed.includes("/")) {
    const withoutScheme = trimmed.replace(/^[a-z]+:\/\//i, "");
    const parts = withoutScheme.split("/").filter(Boolean);
    code = parts.pop() ?? trimmed;
    host = (parts.pop() ?? "").split(":")[0]?.toLowerCase() || null;
  }
  code = decodeURIComponent(code);

  const rows = await client_`
    select l.code, l.long_url, l.title, l.archived_at, l.expires_at, l.created_at, d.host
    from links l
    join domains d on d.id = l.domain_id
    where l.code = ${code}
      and (${host}::text is null or d.host = ${host})
    order by (${host}::text is not null and d.host = ${host}) desc, d.host
    limit 1
  `;
  const row = rows[0];
  if (!row) {
    return { code, host, longUrl: null, title: null, status: "not_found", createdAt: null };
  }

  const expired = Boolean(row.expires_at && new Date(row.expires_at).getTime() < Date.now());

  return {
    code: row.code,
    host: row.host,
    longUrl: row.long_url,
    title: row.title,
    status: row.archived_at ? "archived" : expired ? "expired" : "active",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  };
}

export interface EngagementInput {
  code: string;
  userAgent: string | null;
  referrer: string | null;
  countryCode: string | null;
  city: string | null;
  region: string | null;
  deviceType: string | null;
  os: string | null;
  browser: string | null;
}

/** Record one click. The request id makes a replayed request a no-op. */
export async function recordEngagement(
  input: EngagementInput & { requestId?: string },
): Promise<void> {
  const rows = await client_`
    select
      l.id, l.org_id, l.group_id, l.domain_id, l.code, l.long_url, l.title,
      d.host, q.id as qr_id
    from links l
    join domains d on d.id = l.domain_id
    left join qr_codes q on q.code = l.code and q.domain_id = l.domain_id
    where l.code = ${input.code}
    limit 1
  `;
  const link = rows[0];
  if (!link) return;
  await client_`
    update links set click_count = click_count + 1, updated_at = now() where id = ${link.id}
  `;
  if (link.qr_id) {
    await client_`update qr_codes set scan_count = scan_count + 1 where id = ${link.qr_id}`;
  }
  await client_`
    insert into engagement_events (
      org_id, group_id, link_id, qr_code_id, event_type, request_id,
      country_code, city, region, device_type, os, browser,
      referrer, referrer_domain, user_agent, agent_name
    ) values (
      ${link.org_id}, ${link.group_id}, ${link.id}, ${link.qr_id},
      ${link.qr_id && !link.link_id ? "scan" : "click"}, ${input.requestId ?? null},
      ${input.countryCode}, ${input.city}, ${input.region}, ${input.deviceType},
      ${input.os}, ${input.browser}, ${input.referrer},
      ${input.referrer ? safeHost(input.referrer) : null}, ${input.userAgent},
      ${detectAgent(input.userAgent)}
    )
    on conflict (request_id) where request_id is not null do nothing
  `;

  // A subscriber hears about a click the same way a person does: the
  // delivery is queued, and the worker that empties the queue is the
  // only thing that talks to the subscriber.
  await enqueueWebhook(link.org_id, "engagement", {
    event: "engagement",
    created_at: new Date().toISOString(),
    link: linkPayload({
      id: link.id,
      code: link.code,
      long_url: link.long_url,
      title: link.title,
      host: link.host,
    }),
    click: {
      type: link.qr_id && !link.link_id ? "scan" : "click",
      referrer: input.referrer ?? null,
      referrer_domain: input.referrer ? safeHost(input.referrer) : null,
      country: input.countryCode ?? null,
      city: input.city ?? null,
      region: input.region ?? null,
      device: input.deviceType ?? null,
      os: input.os ?? null,
      browser: input.browser ?? null,
      user_agent: input.userAgent ?? null,
    },
  });
}

export async function recordPageView(pageId: string, userAgent: string | null): Promise<void> {
  const rows = await client_`select org_id, group_id from pages where id = ${pageId} limit 1`;
  const page = rows[0];
  if (!page) return;
  await client_`
    insert into engagement_events (org_id, group_id, page_id, event_type, user_agent, agent_name)
    values (${page.org_id}, ${page.group_id}, ${pageId}, 'page_view', ${userAgent}, ${detectAgent(userAgent)})
  `;
}

function safeHost(referrer: string): string | null {
  try {
    return new URL(referrer).host;
  } catch {
    return null;
  }
}

function detectAgent(userAgent: string | null): string | null {
  if (!userAgent) return null;
  for (const agent of ["ClaudeBot", "GPTBot", "PerplexityBot", "Google-Extended", "CCBot"]) {
    if (userAgent.includes(agent)) return agent;
  }
  return null;
}

export { client, db, schema };

/** The raw rows, for the screens that need to read something unusual. */
export async function readDb(): Promise<unknown[]> {
  return [];
}

/** Apply a change to the database outside a request. */
export async function mutate<T>(fn: (client: SqlClient) => Promise<T>): Promise<T> {
  return fn(client_);
}
