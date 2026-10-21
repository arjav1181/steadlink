import { AsyncLocalStorage } from "node:async_hooks";

/**
 * The organization in scope.
 *
 * The row level security policies read a transaction-local setting,
 * `app.org_id`. A query that runs outside a transaction that sets it sees
 * nothing, so the queries that touch a protected table have to run inside
 * one, with the setting in place.
 *
 * The scope is carried in an async context rather than passed down as an
 * argument, because the queries are spread over the data layer and
 * threading a client through every call would change the shape of all of
 * them. `withOrg` sets it for the work that follows, and the client
 * picks it up.
 */

const store = new AsyncLocalStorage<string>();

/** Run the work with the organization in scope. */
export function withOrg<T>(orgId: string, fn: () => T): T {
  return store.run(orgId, fn);
}

/** The organization in scope, if there is one. */
export function currentOrg(): string | undefined {
  return store.getStore();
}
