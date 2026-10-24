/**
 * Authentication for the public API.
 *
 * A request carries a bearer token. The token is an API key, and it is
 * verified by better-auth — the same code path the settings screen uses, so
 * there is one implementation of "is this token valid" rather than two that
 * can disagree.
 *
 * A token belongs to a workspace. A token that is valid but points at a
 * workspace the caller does not hold is a 403, not a 404: the token is
 * real, and pretending otherwise would hide a configuration mistake.
 */

import { getAuth } from "@steadlink/auth";
import { getApiKeyContext, type Scope, scopeFor } from "@steadlink/data";

import "@/server/session";

export interface ApiIdentity extends Scope {
  keyId: string;
  keyName: string | null;
  /** The explicit `resource:verb` scopes on the token. */
  scopes: string[];
  /** better-auth's resource → action map, used when a token has no scopes. */
  permissions: Record<string, string[]>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** What a verb means in better-auth's action vocabulary. */
const SCOPE_ACTIONS: Record<string, string[]> = {
  read: ["read"],
  write: ["create", "update"],
  delete: ["delete"],
};

/**
 * Does this token hold this scope?
 *
 * An explicit scope list is the source of truth when the token has one.
 * A token created without scopes falls back to better-auth's permission
 * map, which is what the API key plugin hands out by default.
 */
export function scopeAllows(identity: ApiIdentity, required: string): boolean {
  if (identity.scopes.length > 0) return identity.scopes.includes(required);

  const [resource, verb] = required.split(":");
  if (!resource || !verb) return false;
  const actions = SCOPE_ACTIONS[verb] ?? [];
  const granted = identity.permissions[resource] ?? [];
  return actions.length > 0 && actions.every((action) => granted.includes(action));
}

/** The bearer token, or null when the header is not there. */
export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1]!.trim() : null;
}

/**
 * Authenticate a request and return the caller's identity.
 *
 * `required` is the scope the route needs. A token without it gets a 403,
 * with the scope named, so the caller knows what to ask for.
 */
export async function authenticate(request: Request, required?: string): Promise<ApiIdentity> {
  const token = bearerToken(request);
  if (!token) {
    throw new ApiError(
      401,
      "UNAUTHORIZED",
      "This endpoint needs an API token. Send it as `Authorization: Bearer <token>`.",
    );
  }

  const result = await getAuth().api.verifyApiKey({ body: { key: token } });
  if (!result.valid || !result.key) {
    throw new ApiError(401, "UNAUTHORIZED", "That token is not valid, or it has been revoked.");
  }

  const record = result.key as unknown as {
    id: string;
    permissions: Record<string, string[]> | null;
  };

  // The plugin owns the token. The workspace and the owner are ours, so
  // they are read from the row the token came from.
  const context = await getApiKeyContext(record.id);
  if (!context) {
    throw new ApiError(401, "UNAUTHORIZED", "That token is not valid, or it has been revoked.");
  }
  if (!context.orgId) {
    throw new ApiError(
      403,
      "NO_WORKSPACE",
      "That token is not attached to a workspace. Create a new token from the API settings screen.",
    );
  }
  if (!context.userId) {
    throw new ApiError(403, "NO_USER", "That token has no owner.");
  }

  const permissions = record.permissions ?? {};
  const scopes = context.scopes;
  const identity: ApiIdentity = {
    orgId: context.orgId,
    userId: context.userId,
    groupId: "",
    keyId: context.id,
    keyName: context.name,
    scopes,
    permissions,
  };

  if (required && !scopeAllows(identity, required)) {
    throw new ApiError(
      403,
      "INSUFFICIENT_SCOPE",
      `That token does not hold the ${required} scope.`,
    );
  }

  const scope = await scopeFor(context.userId, context.orgId);
  identity.groupId = scope.groupId ?? "";
  return identity;
}

/** The error shape every failed API call returns. */
export function errorBody(error: ApiError) {
  return {
    message: error.message,
    code: error.code,
    documentation_url: "https://go.arjav.is-cool.dev/docs/api",
  };
}
