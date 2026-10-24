/**
 * The clicks on one link, as a spreadsheet.
 *
 * `GET /api/v4/links/{id}/export` answers with a CSV, so a caller can hand
 * it to a spreadsheet without a library. One row per day per dimension.
 */

import { getLink, getLinkMetrics, rangeFromDays } from "@steadlink/data";

import { authenticate } from "@/server/api-auth";
import { handle, queryNumber, queryParam } from "@/server/api-response";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** A CSV cell, quoted when it needs to be. */
function cell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export async function GET(request: Request, context: Params) {
  return handle(async () => {
    const identity = await authenticate(request, "analytics:read");
    const { id } = await context.params;

    const link = await getLink(identity, id);
    if (!link) {
      return new Response("That link no longer exists.", { status: 404 });
    }

    const from = queryNumber(request, "from", 30, 1, 365);
    const metrics = await getLinkMetrics(identity, id, rangeFromDays(from), "engagements");

    const dimension = queryParam(request, "dimension") ?? "day";
    const lines: string[] = ["date,dimension,value"];

    if (dimension === "day") {
      for (const point of metrics.series) {
        lines.push(`${cell(point.date)},day,${cell(point.value)}`);
      }
    } else {
      const groups: Record<string, { label: string; value: number }[]> = {
        country: metrics.byCountry,
        city: metrics.byCity,
        device: metrics.byDevice,
        referrer: metrics.byReferrer,
        os: metrics.byOs,
        browser: metrics.byBrowser,
      };
      for (const row of groups[dimension] ?? []) {
        lines.push(`${cell(row.label)},${cell(dimension)},${cell(row.value)}`);
      }
    }

    const filename = `steadlink-${link.code}-${dimension}.csv`;
    return new Response(`${lines.join("\n")}\n`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
