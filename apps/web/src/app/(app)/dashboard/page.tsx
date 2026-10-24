import {
  getCtx,
  getOverview,
  getUsage,
  getWeeklyInsights,
  listDomains,
  rangeFromDays,
} from "@steadlink/data";
import { Badge, Button, Card, Chip } from "@steadlink/ui";
import { ArrowRight, Link2, Plus, QrCode, Sparkles } from "lucide-react";
import Link from "next/link";
import { EngagementChart } from "@/components/engagement-chart";
import { QuickCreate } from "@/components/quick-create";
import { formatCompact, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await getCtx();
  const [usage, domains, overview, insights] = await Promise.all([
    getUsage(ctx),
    listDomains(ctx),
    getOverview(ctx, rangeFromDays(7), "engagements"),
    getWeeklyInsights(ctx),
  ]);

  const quota = usage.plan.limits.links - usage.usage.links;
  const delta = overview.previousTotal
    ? Math.round(((overview.total - overview.previousTotal) / overview.previousTotal) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Good to see you</h1>
          <p className="mt-1 text-sm text-muted">
            Here is what your links have been doing over the last seven days.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" asChild>
            <Link href="/qr">
              <QrCode aria-hidden="true" className="size-4" />
              New QR code
            </Link>
          </Button>
          <Button asChild>
            <Link href="/links?new=1">
              <Plus aria-hidden="true" className="size-4" />
              New link
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Quick create */}
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Quick create</h2>
                <p className="mt-0.5 text-sm text-muted">Paste a URL and share it in seconds.</p>
              </div>
              {quota > 0 ? (
                <Badge tone={quota <= 10 ? "warning" : "neutral"}>
                  {formatNumber(quota)} links left this month
                </Badge>
              ) : (
                <Badge tone="danger">Monthly limit reached</Badge>
              )}
            </div>
            <div className="mt-5">
              <QuickCreate
                domains={domains.map((domain) => ({
                  id: domain.id,
                  host: domain.host,
                  verificationStatus: domain.verificationStatus,
                  isDefault: domain.kind === "default",
                }))}
              />
            </div>
          </Card>

          {/* Engagement */}
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Total engagements</h2>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="text-3xl font-bold tracking-tight text-foreground">
                    {formatNumber(overview.total)}
                  </span>
                  <span
                    className={
                      delta >= 0
                        ? "text-sm font-semibold text-success"
                        : "text-sm font-semibold text-danger"
                    }
                  >
                    {delta >= 0 ? "+" : ""}
                    {delta}% vs {formatNumber(overview.previousTotal)} before
                  </span>
                </div>
              </div>
              <Link
                href="/analytics"
                className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
              >
                Open analytics
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
            <div className="mt-5">
              <EngagementChart data={overview.series} />
            </div>
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground">Make it yours</h2>
            <p className="mt-1 text-sm text-muted">A few ways to get more out of your links.</p>
            <ul className="mt-4 space-y-2">
              {[
                { href: "/domains", label: "Add your own domain", hint: "Brand every link" },
                {
                  href: "/links?new=1",
                  label: "Write a custom back-half",
                  hint: "Make it readable",
                },
                {
                  href: "/campaigns",
                  label: "Group links into a campaign",
                  hint: "Compare channels",
                },
                {
                  href: "/qr",
                  label: "Turn a link into a QR code",
                  hint: "For print and packaging",
                },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-md border border-border p-3 transition-colors duration-100 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <Link2 aria-hidden="true" className="size-4 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">
                        {item.label}
                      </span>
                      <span className="block text-xs text-muted">{item.hint}</span>
                    </span>
                    <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Sparkles aria-hidden="true" className="size-4 text-ai" />
              Ask about your data
            </h2>
            <p className="mt-1 text-sm text-muted">{insights.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                "Summarise my week",
                "Compare my top links",
                "Which sources drive the most clicks?",
              ].map((suggestion) => (
                <Chip key={suggestion}>{suggestion}</Chip>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground">This month</h2>
            <dl className="mt-4 space-y-3">
              {[
                { label: "Links", value: usage.usage.links, limit: usage.plan.limits.links },
                { label: "QR codes", value: usage.usage.qrCodes, limit: usage.plan.limits.qrCodes },
                { label: "Pages", value: usage.usage.pages, limit: usage.plan.limits.pages },
              ].map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-sm text-muted">{row.label}</dt>
                  <dd className="text-sm font-semibold tabular-nums text-foreground">
                    {formatCompact(row.value)}
                    <span className="font-normal text-muted"> / {formatCompact(row.limit)}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
