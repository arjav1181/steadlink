/**
 * The pages.
 *
 * `GET /api/v4/pages` lists them, `POST` makes one. A page is a small
 * site of its own, published under `/p/{slug}`.
 */

import { createPage, listPages } from "@steadlink/data";

import { authenticate } from "@/server/api-auth";
import { handle, json, optionalString, queryParam, requireString } from "@/server/api-response";
import { publicHost, v4Page } from "@/server/api-shape";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    const identity = await authenticate(request, "pages:read");
    const pages = await listPages(identity);
    const host = publicHost();

    const state = queryParam(request, "state");
    const filtered = state ? pages.filter((page) => page.status === state) : pages;

    return json({
      pages: filtered.map((page) => v4Page(page, host)),
      total: filtered.length,
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const identity = await authenticate(request, "pages:write");

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ message: "The body must be JSON.", code: "INVALID_REQUEST" }, 400);
    }

    const title = requireString(body, "title");
    const slug = optionalString(body, "slug");
    const templateId = optionalString(body, "template_id");

    const created = await createPage(identity, { title, slug, templateId });
    const page = await listPages(identity).then((pages) =>
      pages.find((candidate) => candidate.id === created.id),
    );
    if (!page) {
      return json({ message: "That page no longer exists.", code: "NOT_FOUND" }, 404);
    }
    return json(v4Page(page, publicHost()), 201);
  });
}
