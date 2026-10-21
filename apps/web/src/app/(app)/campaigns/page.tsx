import { getCtx, listCampaigns, listChannels } from "@golink/data";
import { Badge, Button, Card, EmptyState } from "@golink/ui";
import { Plus } from "lucide-react";

import { CampaignDialog } from "@/components/campaigns/campaign-dialog";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const ctx = await getCtx();
  const [campaigns, channels] = await Promise.all([listCampaigns(ctx), listChannels(ctx)]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
          <p className="mt-1 text-sm text-muted">
            Group links by the push they belong to, then compare the channels side by side.
          </p>
        </div>
        <CampaignDialog
          channels={channels.map((channel) => channel.name)}
          trigger={
            <Button>
              <Plus aria-hidden="true" className="size-4" />
              New campaign
            </Button>
          }
        />
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={<Plus aria-hidden="true" />}
          title="No campaigns yet"
          body="A campaign holds a set of links and the channels you share them on, so you can see which push actually worked."
          action={
            <CampaignDialog
              channels={channels.map((channel) => channel.name)}
              trigger={<Button>Create a campaign</Button>}
            />
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">{campaign.name}</h2>
                <Badge tone="neutral">{campaign.linkCount} links</Badge>
              </div>
              <p className="mt-1 text-sm text-muted">
                {formatNumber(campaign.clicks)} clicks across {campaign.channels.length}{" "}
                {campaign.channels.length === 1 ? "channel" : "channels"}.
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {campaign.channels.map((channel) => (
                  <li key={channel.id}>
                    <span className="inline-flex h-7 items-center rounded-pill bg-surface-2 px-3 text-sm font-medium text-muted">
                      {channel.name}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
