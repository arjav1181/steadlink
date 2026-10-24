/**
 * The data layer's public surface.
 *
 * Screens import from here and never from the driver. The function names
 * and signatures did not change when the implementation swapped from the
 * in-memory store to PostgreSQL, so no screen had to change.
 */

export type { Action, Database, Role, Scope, ScopedDb } from "@steadlink/db";
export {
  db,
  ForbiddenError,
  schema,
  scopeFor,
  sql,
  withScope,
} from "@steadlink/db";
export * from "./api.ts";
export { checkDnsRecords, type DnsRecord, type DnsResult } from "./dns.ts";
export { readSession, type SessionIdentity, setSessionReader } from "./session.ts";
