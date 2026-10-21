/**
 * The clicks on one link.
 *
 * `GET /api/v4/links/{id}/clicks` answers with the daily series and the
 * breakdowns, over a range the caller chooses. The default is the last
 * seven days, which is what a dashboard shows.
 */

import { getLink, getLinkMetrics, rangeFromDays } from "@golink/data";

import { authenticate } from "@/server/api-auth";
import { handle, json, queryNumber, queryParam } from "@/server/api-response";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** `from` and `to` are days; `to` of 0 means today. */
function rangeFrom(request: Request) {
  const from = queryNumber(request, "from", 7, 1, 365);
  return rangeFromDays(from);
}

export async function GET(request: Request, context: Params) {
  return handle(async () => {
    const identity = await authenticate(request, "analytics:read");
    const { id } = await context.params;

    const link = await getLink(identity, id);
    if (!link) {
      return json({ message: "That link no longer exists.", code: "NOT_FOUND" }, 404);
    }

    const metricParam = queryParam(request, "metric");
    const metric =
      metricParam === "clicks" || metricParam === "scans" ? metricParam : "engagements";

    const metrics = await getLinkMetrics(identity, id, rangeFrom(request), metric);

    return json({
      link_id: id,
      code: link.code,
      metric,
      total: metrics.total,
      series: metrics.series.map((point) => ({ date: point.date, value: point.value })),
      by_country: metrics.byCountry.map((row) => ({
        key: row.label,
        label: row.label,
        value: row.value,
      })),
      by_city: metrics.byCity.map((row) => ({
        key: row.label,
        label: row.label,
        value: row.value,
      })),
      by_device: metrics.byDevice.map((row) => ({
        key: row.label,
        label: row.label,
        value: row.value,
      })),
      by_referrer: metrics.byReferrer.map((row) => ({
        key: row.label,
        label: row.label,
        value: row.value,
      })),
      by_os: metrics.byOs.map((row) => ({
        key: row.label,
        label: row.label,
        value: row.value,
      })),
      by_browser: metrics.byBrowser.map((row) => ({
        key: row.label,
        label: row.label,
        value: row.value,
      })),
    });
  });
}
