/**
 * The link groups.
 *
 * `GET /api/v4/groups` lists them, `POST` makes one. A group partitions
 * the links in a workspace, so a caller can keep one campaign's links
 * apart from another's.
 */

import { createGroup, getGroups } from "@golink/data";

import { authenticate } from "@/server/api-auth";
import { handle, json, optionalString, requireString } from "@/server/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    const identity = await authenticate(request, "groups:read");
    const groups = await getGroups(identity);
    return json({
      groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        slug: group.slug,
        is_default: group.isDefault,
      })),
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const identity = await authenticate(request, "groups:write");

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ message: "The body must be JSON.", code: "INVALID_REQUEST" }, 400);
    }

    const name = requireString(body, "name");
    const slug = optionalString(body, "slug");
    const group = await createGroup(identity, name, slug);

    return json(
      {
        id: group.id,
        name: group.name,
        slug: group.slug,
        is_default: group.isDefault,
      },
      201,
    );
  });
}
