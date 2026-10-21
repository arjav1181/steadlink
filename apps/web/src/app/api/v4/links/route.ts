/**
 * The link collection.
 *
 * `GET /api/v4/links` lists, `POST /api/v4/links` creates. Both need a
 * token, and the scope the route needs is named in the call, so a token
 * that cannot do this is told what it cannot do.
 */

import { createLink, getLink, type LinkFilters, listLinks } from "@golink/data";

import { authenticate } from "@/server/api-auth";
import {
  handle,
  json,
  optionalString,
  optionalStringArray,
  queryNumber,
  queryParam,
  requireString,
} from "@/server/api-response";
import { publicHost, v4Link } from "@/server/api-shape";

export const dynamic = "force-dynamic";

/** The cursor is the offset, in a form a caller should not hand-edit. */
export function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string | null): number {
  if (!cursor) return 0;
  try {
    const value = Number(Buffer.from(cursor, "base64url").toString("utf8"));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

const SORTS = new Set(["newest", "oldest", "clicks", "title"]);
const STATES = new Set(["active", "hidden", "archived", "all"]);

export async function GET(request: Request) {
  return handle(async () => {
    const identity = await authenticate(request, "links:read");

    const limit = queryNumber(request, "limit", 50, 1, 100);
    const offset = decodeCursor(queryParam(request, "cursor"));

    const sortParam = queryParam(request, "sort");
    const stateParam = queryParam(request, "state");
    const filters: LinkFilters = {
      limit,
      offset,
      query: queryParam(request, "q") ?? undefined,
      createdBy: queryParam(request, "created_by") ?? undefined,
      campaignId: queryParam(request, "campaign_id") ?? undefined,
      sort: sortParam && SORTS.has(sortParam) ? (sortParam as LinkFilters["sort"]) : "newest",
      state: stateParam && STATES.has(stateParam) ? (stateParam as LinkFilters["state"]) : "all",
    };

    const tags = queryParam(request, "tags");
    if (tags)
      filters.tags = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

    const result = await listLinks(identity, filters);
    const host = publicHost();

    return json({
      links: result.links.map((link) => v4Link(link, host)),
      next_cursor:
        offset + result.links.length < result.total
          ? encodeCursor(offset + result.links.length)
          : null,
      prev_cursor: offset > 0 ? encodeCursor(Math.max(0, offset - limit)) : null,
      total: result.total,
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const identity = await authenticate(request, "links:write");

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ message: "The body must be JSON.", code: "INVALID_REQUEST" }, 400);
    }

    const longUrl = requireString(body, "long_url");
    const code = optionalString(body, "custom_back_half");
    const title = optionalString(body, "title");
    const tags = optionalStringArray(body, "tags");
    const expiresAt = optionalString(body, "expires_at");
    const groupId = optionalString(body, "group_id");
    const campaignId = optionalString(body, "campaign_id");
    const channelId = optionalString(body, "channel_id");
    const createQr = body.create_qr === true;

    const created = await createLink(identity, {
      longUrl,
      code,
      title,
      tags,
      groupId,
      campaignId,
      channelId,
      expiresAt: expiresAt ?? null,
      createQr,
    });

    const link = await getLink(identity, created.id);
    if (!link) {
      return json({ message: "That link no longer exists.", code: "NOT_FOUND" }, 404);
    }
    return json(v4Link(link, publicHost()), 201);
  });
}
