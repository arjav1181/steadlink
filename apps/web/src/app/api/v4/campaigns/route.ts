/**
 * The campaigns.
 *
 * A campaign groups the links that share a purpose, and each campaign has
 * one or more channels — the places those links go out to.
 */

import { createCampaign, listCampaigns } from "@steadlink/data";

import { authenticate } from "@/server/api-auth";
import { handle, json, optionalStringArray, requireString } from "@/server/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    const identity = await authenticate(request, "campaigns:read");
    const campaigns = await listCampaigns(identity);

    return json({
      campaigns: campaigns.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        group_id: campaign.groupId,
        link_count: campaign.linkCount,
        clicks: campaign.clicks,
        created_at: campaign.createdAt,
        channels: campaign.channels.map((channel) => ({
          id: channel.id,
          name: channel.name,
        })),
      })),
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const identity = await authenticate(request, "campaigns:write");

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ message: "The body must be JSON.", code: "INVALID_REQUEST" }, 400);
    }

    const name = requireString(body, "name");
    const channels = optionalStringArray(body, "channels") ?? [];
    if (channels.length === 0) {
      return json({ message: "A campaign needs at least one channel.", code: "NO_CHANNELS" }, 400);
    }

    const campaign = await createCampaign(identity, name, channels);
    return json(
      {
        id: campaign.id,
        name: campaign.name,
        group_id: campaign.group_id,
        created_at: campaign.created_at,
        channels: channels.map((channel) => ({ name: channel })),
      },
      201,
    );
  });
}
