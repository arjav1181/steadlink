/**
 * The database client, and the scope every query runs inside.
 *
 * Two rules, and everything else follows:
 *
 *  1. `withScope` opens a transaction, sets `app.current_org_id`, and runs the
 *     work inside it. The row level security policies in the migration read
 *     that setting, so a query that forgot to scope itself returns nothing
 *     rather than everything.
 *
 *  2. The authorisation function answers "can this user do this to this
 *     record" in one place. Every route calls it; no route decides for
 *     itself.
 */

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.ts";

export type Database = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  steadlinkSql?: ReturnType<typeof postgres>;
  steadlinkDb?: Database;
};

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }
  return url;
}

/**
 * A client for a connection string of its own.
 *
 * The migration runner needs this: it connects as the role that may create
 * tables, which is not the role the application runs as. The application
 * connects as an unprivileged role on purpose, so that the row level
 * security policies apply to it.
 */
export function createClient(url: string, max = 1) {
  return postgres<any>(url, {
    max,
    onnotice: () => undefined,
    // Prepared statements cannot hold a transaction-local setting, and
    // postgres.js cannot prepare a DO block. Both matter here.
    prepare: false,
  });
}

/** The raw pooled client. Reused across hot reloads in development. */
export function client() {
  if (!globalForDb.steadlinkSql) {
    // The row type drives postgres.js's parameter types. Left at the default
    // it collapses every parameter to `never`, and every query stops type
    // checking. This client runs hand-written SQL, so the parameters are
    // checked by the database rather than by the compiler.
    // The row type would collapse the parameters to never, and the
    // parameters are checked by the database instead.
    globalForDb.steadlinkSql = postgres<any>(connectionString(), {
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      // The app sets `app.current_org_id` per transaction, so the session
      // cannot hold a pooled connection with a stale scope.
      onnotice: () => undefined,
      // Prepared statements cannot hold a transaction-local setting, and
      // postgres.js cannot prepare a DO block. Both matter here.
      prepare: false,
      // The queries are hand-written, so when one misbehaves the first
      // thing wanted is the text and the parameters that went with it.
      debug:
        process.env.DATABASE_DEBUG === "true"
          ? (_id: number, text: string, parameters: unknown[]) => {
              console.log("[sql]", text, JSON.stringify(parameters));
            }
          : undefined,
    });
  }
  return globalForDb.steadlinkSql;
}

export function db(): Database {
  if (!globalForDb.steadlinkDb) {
    globalForDb.steadlinkDb = drizzle(client(), { schema });
  }
  return globalForDb.steadlinkDb;
}

/** An alias for client(), kept because it reads better at the call site. */
export function sql() {
  return client();
}

/* -------------------------------------------------------------------------
 * Scope
 * ------------------------------------------------------------------------- */

export interface Scope {
  orgId: string;
  userId?: string;
  groupId?: string;
}

/**
 * Run work inside a transaction that is scoped to one organization.
 *
 * The setting is transaction-local (`true`), so a pooled connection never
 * carries a scope into the next request.
 */
export async function withScope<T>(scope: Scope, fn: (tx: ScopedDb) => Promise<T>): Promise<T> {
  const client = sql();
  // postgres.js types `begin` in terms of a promise that might resolve to an
  // array. The callback here never does, so the result is cast back.
  return client.begin(async (tx) => {
    // The transaction-local setting the row level security policies read.
    await tx`select set_config('app.org_id', ${scope.orgId}, true)`;
    return fn(tx as unknown as ScopedDb);
  }) as Promise<T>;
}

/** A Drizzle handle bound to a transaction. */
export type ScopedDb = Database;

/** The scope for the signed-in user, taken from the session. */
export async function scopeFor(userId: string, orgId: string): Promise<Scope> {
  // The membership lives in better-auth's `member` table. There is no
  // `memberships` table: the workspace's members are the organisation
  // plugin's rows.
  const group = await sql()<{ id: string }[]>`
    select g.id
    from groups g
    join member m on m.organization_id = g.org_id
    where m.user_id = ${userId}
      and m.organization_id = ${orgId}
      and g.is_default
    limit 1
  `;
  const fallback = await sql()<{ id: string }[]>`
    select id from groups where org_id = ${orgId} order by created_at limit 1
  `;
  return {
    orgId,
    userId,
    groupId: group[0]?.id ?? fallback[0]?.id ?? "",
  };
}

/* -------------------------------------------------------------------------
 * Authorisation
 * ------------------------------------------------------------------------- */

export type Role = "owner" | "admin" | "member" | "viewer";

const _RANK: Record<Role, number> = { viewer: 1, member: 2, admin: 3, owner: 4 };

/** What a role may do. One table, so there is one place to change it. */
const ALLOWED: Record<Role, readonly string[]> = {
  viewer: ["read"],
  member: ["read", "create", "update"],
  admin: ["read", "create", "update", "delete", "invite", "manage_webhooks", "manage_tokens"],
  owner: [
    "read",
    "create",
    "update",
    "delete",
    "invite",
    "manage_webhooks",
    "manage_tokens",
    "manage_billing",
    "manage_org",
  ],
};

export type Action =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "invite"
  | "manage_webhooks"
  | "manage_tokens"
  | "manage_billing"
  | "manage_org";

export async function roleOf(userId: string, orgId: string): Promise<Role | null> {
  const rows = await sql()<{ role: Role }[]>`
    select role from member
    where user_id = ${userId} and organization_id = ${orgId}
    limit 1
  `;
  return rows[0]?.role ?? null;
}

/**
 * "Can this user do this to this record?"
 *
 * Every write path calls this before it writes. A user who is not a member
 * of the organization gets `false`, not an exception.
 */
export async function can(
  scope: Scope,
  action: Action,
  record?: { orgId?: string | null },
): Promise<boolean> {
  if (!scope.userId) return false;
  if (record?.orgId && record.orgId !== scope.orgId) return false;

  const role = await roleOf(scope.userId, scope.orgId);
  if (!role) return false;

  if (role === "owner") return true;
  return ALLOWED[role].includes(action);
}

/** Throws when the action is not allowed. Used at the top of a route. */
export async function assertCan(scope: Scope, action: Action, record?: { orgId?: string | null }) {
  if (!(await can(scope, action, record))) {
    throw new ForbiddenError(action);
  }
}

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(action: Action) {
    super(`You do not have permission to ${action.replace(/_/g, " ")}.`);
  }
}

export { schema };
