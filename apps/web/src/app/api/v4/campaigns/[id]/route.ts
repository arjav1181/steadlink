/**
 * One campaign.
 *
 * `PATCH` renames it, `DELETE` removes it. The links that pointed at it
 * keep their history and lose the campaign.
 */

import { deleteCampaign, updateCampaign } from "@golink/data";

import { authenticate } from "@/server/api-auth";
import { handle, json, requireString } from "@/server/api-response";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Params) {
  return handle(async () => {
    const identity = await authenticate(request, "campaigns:write");
    const { id } = await context.params;

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ message: "The body must be JSON.", code: "INVALID_REQUEST" }, 400);
    }

    const name = requireString(body, "name");
    const campaign = await updateCampaign(identity, id, name);
    return json({ id: campaign.id, name: campaign.name });
  });
}

export async function DELETE(request: Request, context: Params) {
  return handle(async () => {
    const identity = await authenticate(request, "campaigns:write");
    const { id } = await context.params;

    await deleteCampaign(identity, id);
    return new Response(null, { status: 204 });
  });
}
