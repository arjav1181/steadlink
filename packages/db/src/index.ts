export {
  type Action,
  assertCan,
  can,
  client,
  type Database,
  db,
  ForbiddenError,
  type Role,
  roleOf,
  type Scope,
  type ScopedDb,
  scopeFor,
  sql,
  withScope,
} from "./client.ts";
export * as schema from "./schema.ts";
export { createWorkspaceDefaults, type WorkspaceDefaults } from "./workspace.ts";
