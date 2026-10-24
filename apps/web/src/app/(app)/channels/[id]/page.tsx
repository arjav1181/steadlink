import { getChannelMetrics, getCtx, listChannels, rangeFromDays } from "@steadlink/data";
import { Badge, Card, StatCard } from "@steadlink/ui";
import { notFound } from "next/navigation";

import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ChannelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCtx();
  const channels = await listChannels(ctx);
  const channel = channels.find((candidate) => candidate.id === id);
  if (!channel) notFound();

  const metrics = await getChannelMetrics(ctx, id, rangeFromDays(30));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{channel.name}</h1>
        <p className="mt-1 text-sm text-muted">
          A channel of one campaign. Links placed here carry{" "}
          <code className="font-mono">
            utm_source=
            {channel.name}
          </code>{" "}
          automatically.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Clicks" value={formatNumber(metrics.total)} />
        <StatCard label="Links" value={metrics.links.length} />
        <StatCard
          label="Average per link"
          value={Math.round(metrics.total / Math.max(1, metrics.links.length))}
        />
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground">Links in this channel</h2>
        {metrics.links.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No links have been added to this channel yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {metrics.links.map((link) => (
              <li key={link.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-foreground">
                  {link.title ?? link.code}
                </span>
                <span className="shrink-0 tabular-nums text-muted">
                  {formatNumber(link.clicks)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground">How this works</h2>
        <p className="mt-2 text-sm text-muted">
          When you upload a spreadsheet into a campaign, every row gets the campaign name as its
          <code className="font-mono"> utm_campaign</code> and the channel as its
          <code className="font-mono"> utm_source</code>. The link keeps working, and the reporting
          splits itself.
        </p>
        <p className="mt-3">
          <Badge tone="neutral">utm_medium is always steadlink</Badge>
        </p>
      </Card>
    </div>
  );
}
