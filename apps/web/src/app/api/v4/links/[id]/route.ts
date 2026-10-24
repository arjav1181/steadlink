/**
 * One link.
 *
 * `GET` reads it, `PATCH` edits it, `DELETE` removes it. The id is the
 * link's uuid, so a caller never has to know which host it was made on.
 */

import { deleteLink, getLink, setLinkState, updateLink } from "@steadlink/data";

import { authenticate } from "@/server/api-auth";
import { handle, json, optionalString, optionalStringArray } from "@/server/api-response";
import { publicHost, v4Link } from "@/server/api-shape";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Params) {
  return handle(async () => {
    const identity = await authenticate(request, "links:read");
    const { id } = await context.params;

    const link = await getLink(identity, id);
    if (!link) {
      return json({ message: "That link no longer exists.", code: "NOT_FOUND" }, 404);
    }
    return json(v4Link(link, publicHost()));
  });
}

export async function PATCH(request: Request, context: Params) {
  return handle(async () => {
    const identity = await authenticate(request, "links:write");
    const { id } = await context.params;

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ message: "The body must be JSON.", code: "INVALID_REQUEST" }, 400);
    }

    const patch: {
      title?: string;
      tags?: string[];
      expiresAt?: string | null;
      longUrl?: string;
    } = {};

    const title = optionalString(body, "title");
    if (title !== undefined) patch.title = title;

    const tags = optionalStringArray(body, "tags");
    if (tags !== undefined) patch.tags = tags;

    if (body.expires_at === null) patch.expiresAt = null;
    else {
      const expiresAt = optionalString(body, "expires_at");
      if (expiresAt !== undefined) patch.expiresAt = expiresAt;
    }

    const longUrl = optionalString(body, "long_url");
    if (longUrl !== undefined) patch.longUrl = longUrl;

    // The state is a separate field on the API, because hiding a link is
    // not the same thing as editing it.
    const state = body.archived === true ? "archive" : body.archived === false ? "restore" : null;
    const hidden = body.hidden === true ? "hide" : body.hidden === false ? "show" : null;

    if (Object.keys(patch).length > 0) await updateLink(identity, id, patch);
    if (state) await setLinkState(identity, id, state);
    if (hidden) await setLinkState(identity, id, hidden);

    const link = await getLink(identity, id);
    if (!link) {
      return json({ message: "That link no longer exists.", code: "NOT_FOUND" }, 404);
    }
    return json(v4Link(link, publicHost()));
  });
}

export async function DELETE(request: Request, context: Params) {
  return handle(async () => {
    const identity = await authenticate(request, "links:delete");
    const { id } = await context.params;

    const link = await getLink(identity, id);
    if (!link) {
      return json({ message: "That link no longer exists.", code: "NOT_FOUND" }, 404);
    }
    await deleteLink(identity, id);
    return new Response(null, { status: 204 });
  });
}
