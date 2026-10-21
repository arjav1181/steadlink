/**
 * What does this short link point at?
 *
 * `GET /api/v4/expand?url={code}` answers with the destination. Anyone can
 * ask — that is the point of it — so it is the endpoint that most needs a
 * rate limit, and it is the one that leaks the least: a code and its
 * destination, nothing else.
 *
 * A link that is archived or expired says so, rather than pretending it
 * does not exist. A caller can tell the difference between "that code was
 * never here" and "that code was here and has since been retired".
 */

import { getLinkByCode } from "@golink/data";

import { handle, json, queryParam } from "@/server/api-response";
import { callerAddress, limitHeaders, take } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

/** Calls per minute, per address. */
const LIMIT = 60;
const WINDOW_MS = 60_000;

export async function GET(request: Request) {
  return handle(async () => {
    const limit = take(`expand:${callerAddress(request)}`, LIMIT, WINDOW_MS);
    if (!limit.ok) {
      return json(
        { message: "Too many requests. Try again in a moment.", code: "RATE_LIMITED" },
        429,
        limitHeaders(limit, LIMIT),
      );
    }

    const raw = queryParam(request, "url");
    if (!raw) {
      return json({ message: "url is required.", code: "INVALID_REQUEST" }, 400);
    }

    // The caller may pass a full address or just the code.
    const code = raw.includes("/") ? (raw.split("/").filter(Boolean).pop() ?? raw) : raw;

    const link = await getLinkByCode(code);
    if (!link) {
      return json({ message: "That code does not exist.", code: "NOT_FOUND" }, 404);
    }

    const expired = link.expires_at ? new Date(link.expires_at).getTime() <= Date.now() : false;
    if (link.archived_at) {
      return json(
        {
          code: link.code,
          long_url: link.long_url,
          title: link.title,
          archived: true,
          active: false,
        },
        200,
        limitHeaders(limit, LIMIT),
      );
    }
    if (expired) {
      return json(
        {
          code: link.code,
          long_url: link.long_url,
          title: link.title,
          expired: true,
          active: false,
        },
        200,
        limitHeaders(limit, LIMIT),
      );
    }

    return json(
      {
        code: link.code,
        long_url: link.long_url,
        title: link.title,
        archived: false,
        expired: false,
        active: true,
        created_at: link.created_at,
      },
      200,
      limitHeaders(limit, LIMIT),
    );
  });
}
