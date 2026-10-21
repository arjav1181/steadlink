import { RESERVED_CODES } from "@golink/data";
import { type NextRequest, NextResponse } from "next/server";

import { factsFromHeaders, logEngagement, resolve } from "@/server/redirect";

/**
 * The redirect fallback.
 *
 * The custom Node server handles this before Next sees the request; this
 * route exists so `next start` without the custom server still works.
 *
 * It is a catch-all for any single path segment, so it has to leave the
 * app's own route names alone. A reserved name is a 404, not a redirect to
 * the "link not found" page: `/channels` is a missing page, not a broken
 * short link.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;

  if (RESERVED_CODES.has(code.toLowerCase())) {
    return new NextResponse("Not found", { status: 404 });
  }

  const outcome = await resolve(code, request.headers.get("host") ?? undefined);

  if (outcome.kind === "redirect") {
    logEngagement(code, factsFromHeaders(request.headers));
    return NextResponse.redirect(outcome.longUrl, { status: 302 });
  }

  if (outcome.kind === "expired") {
    return NextResponse.redirect(new URL("/gone?reason=expired", request.url), { status: 302 });
  }
  if (outcome.kind === "archived") {
    return NextResponse.redirect(new URL("/gone?reason=archived", request.url), { status: 302 });
  }
  return NextResponse.redirect(new URL("/gone?reason=missing", request.url), { status: 302 });
}
