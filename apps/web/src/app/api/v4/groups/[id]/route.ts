/**
 * One link group.
 *
 * `PATCH` renames it, `DELETE` removes it. The links that were in it move
 * to the default group rather than going with it.
 */

import { deleteGroup, updateGroup } from "@steadlink/data";

import { authenticate } from "@/server/api-auth";
import { handle, json, optionalString } from "@/server/api-response";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Params) {
  return handle(async () => {
    const identity = await authenticate(request, "groups:write");
    const { id } = await context.params;

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ message: "The body must be JSON.", code: "INVALID_REQUEST" }, 400);
    }

    const name = optionalString(body, "name");
    const slug = optionalString(body, "slug");
    const group = await updateGroup(identity, id, { name, slug });

    return json({
      id: group.id,
      name: group.name,
      slug: group.slug,
      is_default: group.isDefault,
    });
  });
}

export async function DELETE(request: Request, context: Params) {
  return handle(async () => {
    const identity = await authenticate(request, "groups:write");
    const { id } = await context.params;

    await deleteGroup(identity, id);
    return new Response(null, { status: 204 });
  });
}
