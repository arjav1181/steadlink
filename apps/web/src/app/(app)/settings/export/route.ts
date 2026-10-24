/**
 * Every link in the workspace, as a spreadsheet.
 *
 * `GET /settings/export` answers with a CSV. It is behind the session, not
 * behind a token: the button on the bulk uploads screen is a link, and a
 * link cannot carry a bearer token.
 *
 * The public API has its own export, at `/api/v4/links/{id}/export`, for
 * the callers that do have a token.
 */

import { getCtx, listLinks } from "@steadlink/data";

export const dynamic = "force-dynamic";

/** A CSV cell, quoted when it needs to be. */
function cell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export async function GET() {
  const ctx = await getCtx();
  const { links } = await listLinks(ctx, {
    state: "all",
    sort: "newest",
    limit: 1000,
    groupId: ctx.groupId,
  });

  const lines = ["code,short_link,destination,title,clicks,created_at,state"];
  for (const link of links) {
    lines.push(
      [
        cell(link.code),
        cell(`https://${link.domain.host}/${link.code}`),
        cell(link.longUrl),
        cell(link.title),
        cell(link.clickCountTotal),
        cell(link.createdAt),
        cell(link.archivedAt ? "archived" : link.hiddenAt ? "hidden" : "active"),
      ].join(","),
    );
  }

  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="steadlink-links.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
