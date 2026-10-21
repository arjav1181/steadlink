/**
 * One QR code.
 *
 * `GET` reads it, `PATCH` edits the title, the design or the expiry, and
 * `DELETE` removes it.
 */

import { deleteQrCode, getQrCode, updateQrCode } from "@golink/data";

import { authenticate } from "@/server/api-auth";
import { handle, json, optionalString, optionalStringArray } from "@/server/api-response";
import { publicHost, v4QrCode } from "@/server/api-shape";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Params) {
  return handle(async () => {
    const identity = await authenticate(request, "qr:read");
    const { id } = await context.params;

    const code = await getQrCode(identity, id);
    if (!code) {
      return json({ message: "That code no longer exists.", code: "NOT_FOUND" }, 404);
    }
    return json(v4QrCode(code, publicHost()));
  });
}

export async function PATCH(request: Request, context: Params) {
  return handle(async () => {
    const identity = await authenticate(request, "qr:write");
    const { id } = await context.params;

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ message: "The body must be JSON.", code: "INVALID_REQUEST" }, 400);
    }

    const patch: {
      title?: string;
      design?: Record<string, unknown>;
      tags?: string[];
      expiresAt?: string | null;
      longUrl?: string;
    } = {};

    const title = optionalString(body, "title");
    if (title !== undefined) patch.title = title;

    const tags = optionalStringArray(body, "tags");
    if (tags !== undefined) patch.tags = tags;

    if (body.design && typeof body.design === "object") {
      patch.design = body.design as Record<string, unknown>;
    }
    if (body.expires_at === null) patch.expiresAt = null;
    else {
      const expiresAt = optionalString(body, "expires_at");
      if (expiresAt !== undefined) patch.expiresAt = expiresAt;
    }
    const longUrl = optionalString(body, "long_url");
    if (longUrl !== undefined) patch.longUrl = longUrl;

    await updateQrCode(identity, id, patch);

    const code = await getQrCode(identity, id);
    if (!code) {
      return json({ message: "That code no longer exists.", code: "NOT_FOUND" }, 404);
    }
    return json(v4QrCode(code, publicHost()));
  });
}

export async function DELETE(request: Request, context: Params) {
  return handle(async () => {
    const identity = await authenticate(request, "qr:write");
    const { id } = await context.params;

    const code = await getQrCode(identity, id);
    if (!code) {
      return json({ message: "That code no longer exists.", code: "NOT_FOUND" }, 404);
    }
    await deleteQrCode(identity, id);
    return new Response(null, { status: 204 });
  });
}
