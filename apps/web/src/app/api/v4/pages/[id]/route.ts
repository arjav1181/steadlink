/**
 * One page.
 *
 * `GET` reads it with its blocks, `PATCH` edits the title, the slug or the
 * appearance, and `DELETE` removes it.
 */

import { deletePage, getPage, updatePage } from "@steadlink/data";

import { authenticate } from "@/server/api-auth";
import { handle, json, optionalString } from "@/server/api-response";
import { publicHost, v4Page } from "@/server/api-shape";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Params) {
  return handle(async () => {
    const identity = await authenticate(request, "pages:read");
    const { id } = await context.params;

    const page = await getPage(identity, id);
    if (!page) {
      return json({ message: "That page no longer exists.", code: "NOT_FOUND" }, 404);
    }
    return json(v4Page(page, publicHost()));
  });
}

export async function PATCH(request: Request, context: Params) {
  return handle(async () => {
    const identity = await authenticate(request, "pages:write");
    const { id } = await context.params;

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ message: "The body must be JSON.", code: "INVALID_REQUEST" }, 400);
    }

    const patch: {
      title?: string;
      slug?: string;
      appearance?: Record<string, unknown>;
      seo?: Record<string, unknown>;
    } = {};

    const title = optionalString(body, "title");
    if (title !== undefined) patch.title = title;
    const slug = optionalString(body, "slug");
    if (slug !== undefined) patch.slug = slug;
    if (body.appearance && typeof body.appearance === "object") {
      patch.appearance = body.appearance as Record<string, unknown>;
    }
    if (body.seo && typeof body.seo === "object") {
      patch.seo = body.seo as Record<string, unknown>;
    }

    await updatePage(identity, id, patch);

    const page = await getPage(identity, id);
    if (!page) {
      return json({ message: "That page no longer exists.", code: "NOT_FOUND" }, 404);
    }
    return json(v4Page(page, publicHost()));
  });
}

export async function DELETE(request: Request, context: Params) {
  return handle(async () => {
    const identity = await authenticate(request, "pages:write");
    const { id } = await context.params;

    const page = await getPage(identity, id);
    if (!page) {
      return json({ message: "That page no longer exists.", code: "NOT_FOUND" }, 404);
    }
    await deletePage(identity, id);
    return new Response(null, { status: 204 });
  });
}
