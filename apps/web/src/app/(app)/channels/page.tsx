import { getCtx, listCampaigns, listChannels } from "@steadlink/data";
import { Badge, Card, EmptyState } from "@steadlink/ui";
import { Globe } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ChannelsPage() {
  const ctx = await getCtx();
  const [channels, campaigns] = await Promise.all([listChannels(ctx), listCampaigns(ctx)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Channels</h1>
        <p className="mt-1 text-sm text-muted">
          A channel is one push of a campaign. Each one becomes a UTM source on the links that
          belong to it.
        </p>
      </div>

      {channels.length === 0 ? (
        <EmptyState
          icon={<Globe aria-hidden="true" />}
          title="No channels yet"
          body="Create a campaign and give it a channel, then add links to it."
          action={
            <Link
              href="/campaigns"
              className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground"
            >
              Go to campaigns
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => {
            const campaign = campaigns.find((candidate) => candidate.id === channel.campaignId);
            return (
              <Card key={channel.id} className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-foreground">{channel.name}</h2>
                  {campaign ? <Badge tone="neutral">{campaign.name}</Badge> : null}
                </div>
                <p className="mt-2 font-mono text-xs text-muted">utm_source={channel.name}</p>
                <Link
                  href={`/channels/${channel.id}`}
                  className="mt-4 inline-block text-sm font-semibold text-accent hover:underline"
                >
                  See the numbers
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
