import {
  getCtx,
  getLink,
  getLinkMetrics,
  getRoutingRules,
  listDeeplinks,
  rangeFromDays,
} from "@golink/data";
import { Badge, Card, CopyButton, ShareButton, Tag as TagChip } from "@golink/ui";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EngagementChart } from "@/components/engagement-chart";
import { LinkActions } from "@/components/links/link-actions";
import { LinkDetailMenu } from "@/components/links/link-detail-menu";
import { LinkQrPanel } from "@/components/links/link-qr-panel";
import { LinkRouting } from "@/components/links/link-routing";

import { formatDate, formatNumber, linkStateLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATE_TONE = {
  Active: "success",
  Hidden: "neutral",
  Archived: "neutral",
  Expired: "warning",
} as const;

export default async function LinkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCtx();
  const link = await getLink(ctx, id);
  if (!link) notFound();

  const [metrics, rules, deeplinks] = await Promise.all([
    getLinkMetrics(ctx, id, rangeFromDays(30), "engagements"),
    getRoutingRules(ctx, id),
    listDeeplinks(ctx, id),
  ]);

  const state = linkStateLabel(link);
  const shortUrl = `${link.domain.host}/${link.code}`;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/links"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          All links
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{link.title ?? link.code}</h1>
              <Badge tone={STATE_TONE[state]}>{state}</Badge>
              {link.version > 1 ? <Badge tone="neutral">Version {link.version}</Badge> : null}
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <a
                href={link.longUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="font-mono text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {shortUrl}
                <ExternalLink aria-hidden="true" className="ml-1 inline size-3.5" />
              </a>
              <CopyButton value={`https://${shortUrl}`} />
              <ShareButton value={`https://${shortUrl}`} title={link.title ?? link.code} />
            </p>
            <p className="mt-1 max-w-[60ch] truncate text-sm text-muted">{link.longUrl}</p>
            {link.tags.length ? (
              <p className="mt-2 flex flex-wrap gap-1">
                {link.tags.map((tag) => (
                  <TagChip key={tag}>{tag}</TagChip>
                ))}
              </p>
            ) : null}
          </div>

          <div className="flex gap-2">
            <LinkActions
              linkId={link.id}
              state={state}
              link={{
                id: link.id,
                code: link.code,
                title: link.title,
                longUrl: link.longUrl,
                tags: link.tags,
                domainHost: link.domain.host,
              }}
            />
            <LinkDetailMenu linkId={link.id} state={state} />
          </div>
        </div>
      </div>

      {/* Numbers */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Clicks", value: link.clickCountTotal },
          { label: "Scans", value: link.scanCount },
          { label: "Engagements", value: link.engagementCount },
          { label: "Created", value: formatDate(link.createdAt), text: true },
        ].map((card) => (
          <Card key={card.label} className="p-5">
            <p className="text-sm font-medium text-muted">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {"text" in card && card.text ? card.value : formatNumber(card.value as number)}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground">Engagement over time</h2>
            <p className="mt-1 text-sm text-muted">The last 30 days, clicks and scans together.</p>
            <div className="mt-4">
              <EngagementChart data={metrics.series} />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground">Where the clicks came from</h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Referrers</h3>
                <ul className="mt-2 space-y-1.5">
                  {metrics.byReferrer.length === 0 ? (
                    <li className="text-sm text-muted">No clicks yet.</li>
                  ) : (
                    metrics.byReferrer.slice(0, 6).map((row) => (
                      <li
                        key={row.label}
                        className="flex items-baseline justify-between gap-3 text-sm"
                      >
                        <span className="min-w-0 truncate text-muted">{row.label}</span>
                        <span className="shrink-0 tabular-nums text-foreground">
                          {formatNumber(row.value)}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Devices</h3>
                <ul className="mt-2 space-y-1.5">
                  {metrics.byDevice.length === 0 ? (
                    <li className="text-sm text-muted">No clicks yet.</li>
                  ) : (
                    metrics.byDevice.slice(0, 6).map((row) => (
                      <li
                        key={row.label}
                        className="flex items-baseline justify-between gap-3 text-sm"
                      >
                        <span className="min-w-0 truncate text-muted">{row.label}</span>
                        <span className="shrink-0 tabular-nums text-foreground">
                          {formatNumber(row.value)}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </Card>

          <LinkRouting linkId={link.id} rules={rules} />
        </div>

        <div className="space-y-6">
          <LinkQrPanel qrCode={link.qrCode} linkId={link.id} />

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground">Mobile deep links</h2>
            {deeplinks.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                None. When a deep link is set, this address opens your app instead of the website.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {deeplinks.map((deeplink) => (
                  <li key={deeplink.id} className="rounded-md border border-border p-3 text-sm">
                    <p className="font-mono text-xs text-foreground">{deeplink.appUriPath}</p>
                    <p className="mt-1 text-xs text-muted">
                      {deeplink.os === "ios" ? "iOS" : "Android"} ·{" "}
                      {deeplink.installType.replace(/_/g, " ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground">Details</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ["Created", formatDate(link.createdAt)],
                ["Last updated", formatDate(link.updatedAt)],
                ["Group", link.group.name],
                ["Version", `v${link.version}`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
