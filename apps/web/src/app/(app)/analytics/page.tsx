import {
  getCtx,
  getOverview,
  getTopLinks,
  getWeeklyInsights,
  type Range,
  rangeFromDays,
} from "@steadlink/data";
import { Badge, Button, Card, StatCard } from "@steadlink/ui";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { AnalyticsWidgets } from "@/components/analytics/analytics-widgets";
import { AssistantLauncher } from "@/components/analytics/assistant-launcher";
import { RangePicker } from "@/components/analytics/range-picker";

import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * A range of two dates.
 *
 * A range that ends before it starts is refused, and a range with only
 * one end falls back to the other: a person who says "from the 1st" means
 * from the 1st until now.
 */
function customRange(from: string, to: string): Range {
  const start = from ? new Date(`${from}T00:00:00.000Z`) : new Date();
  const end = to ? new Date(`${to}T23:59:59.999Z`) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return rangeFromDays(7);
  }
  if (start.getTime() > end.getTime()) return rangeFromDays(7);
  return { from: start, to: end };
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    metric?: string;
    assistant?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;
  const ctx = await getCtx();

  // A preset counts back from now. A custom range is two dates, and the
  // answer is refused if they do not make sense: a range that ends
  // before it starts is a question with no answer, and a silent
  // correction would be worse than saying so.
  const wanted = params.range ?? "7";
  const custom = wanted === "custom";
  const fromParam = typeof params.from === "string" ? params.from : "";
  const toParam = typeof params.to === "string" ? params.to : "";
  const days = Number(wanted);
  const range = custom
    ? customRange(fromParam, toParam)
    : rangeFromDays(Number.isFinite(days) && days > 0 ? days : 7);
  const metric = (
    params.metric === "clicks" || params.metric === "scans" ? params.metric : "engagements"
  ) as "engagements" | "clicks" | "scans";

  const [overview, top, insights] = await Promise.all([
    getOverview(ctx, range, metric),
    getTopLinks(ctx, range, 10),
    getWeeklyInsights(ctx),
  ]);

  const delta = overview.previousTotal
    ? Math.round(((overview.total - overview.previousTotal) / overview.previousTotal) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted">
            Clicks, scans and page views across every link you own.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RangePicker
            days={custom ? "custom" : String(Number.isFinite(days) ? days : 7)}
            from={fromParam}
            to={toParam}
            metric={metric}
          />
          <AssistantLauncher />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={
            metric === "engagements" ? "Engagements" : metric === "clicks" ? "Clicks" : "Scans"
          }
          value={formatNumber(overview.total)}
          delta={delta}
          deltaLabel={`vs ${formatNumber(overview.previousTotal)} before`}
        />
        <StatCard label="Top referrer" value={overview.byReferrer[0]?.label ?? "—"} />
        <StatCard label="Busiest country" value={overview.byCountry[0]?.label ?? "—"} />
        <StatCard label="Busiest device" value={overview.byDevice[0]?.label ?? "—"} />
      </div>

      <AnalyticsWidgets overview={overview} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Top performing links</h2>
              <p className="mt-1 text-sm text-muted">Ranked by engagement in this range.</p>
            </div>
            <Link
              href="/links"
              className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
            >
              All links
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          {top.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No engagement in this range yet.</p>
          ) : (
            <ol className="mt-4 space-y-2">
              {top.map((row, index) => (
                <li key={row.id} className="flex items-baseline gap-3">
                  <span className="w-5 shrink-0 text-sm tabular-nums text-muted">{index + 1}</span>
                  <Link
                    href={`/links/${row.id}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {row.title ?? row.code}
                  </Link>
                  <span className="shrink-0 text-sm tabular-nums text-muted">
                    {formatNumber(row.value)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground">This week</h2>
          <p className="mt-1 text-sm text-muted">{insights.summary}</p>
          <ul className="mt-4 space-y-2">
            {insights.topReferrers.map((row) => (
              <li key={row.label} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-muted">{row.label}</span>
                <span className="shrink-0 tabular-nums text-foreground">
                  {formatNumber(row.value)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-2">
            <Badge tone={insights.delta >= 0 ? "success" : "danger"}>
              {insights.delta >= 0 ? "+" : ""}
              {insights.delta}% week over week
            </Badge>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/analytics?range=30">Compare a month</Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
