import { getCtx, getQrCode, getQrMetrics, listLinks, rangeFromDays } from "@steadlink/data";
import { Badge, Card, CopyButton, QrPreview, StatCard } from "@steadlink/ui";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { QrDownloadButton } from "@/components/qr/qr-download-button";
import { QrEditor } from "@/components/qr/qr-editor";

import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function QrDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCtx();
  const qr = await getQrCode(ctx, id);
  if (!qr) notFound();

  const [metrics, links] = await Promise.all([
    getQrMetrics(ctx, id, rangeFromDays(30)),
    listLinks(ctx, { limit: 50, groupId: ctx.groupId }),
  ]);

  const shortUrl = `https://go.arjav.is-cool.dev/${qr.code}`;
  const paired = qr.linkId ? links.links.find((link) => link.id === qr.linkId) : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/qr"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          All QR codes
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{qr.title ?? qr.code}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm">
              <a
                href={shortUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="font-mono text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {shortUrl}
                <ExternalLink aria-hidden="true" className="ml-1 inline size-3.5" />
              </a>
              <CopyButton value={shortUrl} />
            </p>
            <p className="mt-1 text-sm text-muted">Points at {qr.longUrl}</p>
          </div>
          <div className="flex gap-2">
            <QrDownloadButton code={qr.code} design={qr.design} url={shortUrl} />
            <QrEditor qrId={qr.id} design={qr.design} title={qr.title} shortUrl={shortUrl} />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Badge tone={paired ? "success" : "neutral"}>
            {paired ? "Paired with a link" : "Standalone code"}
          </Badge>
          {qr.expiresAt ? (
            <Badge tone={new Date(qr.expiresAt).getTime() < Date.now() ? "warning" : "neutral"}>
              Expires {new Date(qr.expiresAt).toLocaleDateString("en-US")}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center p-6">
          <QrPreview text={shortUrl} design={qr.design} size={220} />
          <p className="mt-4 text-sm text-muted">
            The code points at {shortUrl}. Anyone who scans it lands there.
          </p>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Scans" value={formatNumber(metrics.total)} />
            <StatCard
              label="Days scanned"
              value={metrics.series.filter((point) => point.value > 0).length}
            />
            <StatCard label="Top place" value={metrics.byCountry[0]?.label ?? "—"} />
          </div>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground">Scans over time</h2>
            <p className="mt-1 text-sm text-muted">The last 30 days.</p>
            <ul className="mt-4 space-y-2">
              {metrics.series.slice(-7).map((point) => (
                <li key={point.date} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-muted">{point.date}</span>
                  <span className="tabular-nums text-foreground">{point.value}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground">Where it was scanned</h2>
            {metrics.byCountry.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No scans yet.</p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {metrics.byCountry.slice(0, 6).map((row) => (
                  <li key={row.label} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-muted">{row.label}</span>
                    <span className="tabular-nums text-foreground">{formatNumber(row.value)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
