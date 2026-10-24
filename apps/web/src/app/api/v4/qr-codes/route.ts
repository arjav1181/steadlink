/**
 * The QR codes.
 *
 * `GET /api/v4/qr-codes` lists them, `POST` makes one. A code can stand on
 * its own or hang off a link, in which case its destination follows the
 * link and a printed code never goes stale.
 */

import { createQrCode, getQrCode, listQrCodes } from "@steadlink/data";

import { authenticate } from "@/server/api-auth";
import {
  handle,
  json,
  optionalString,
  optionalStringArray,
  queryParam,
  requireString,
} from "@/server/api-response";
import { publicHost, v4QrCode } from "@/server/api-shape";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    const identity = await authenticate(request, "qr:read");
    const query = queryParam(request, "q") ?? undefined;
    const tag = queryParam(request, "tag") ?? undefined;

    const codes = await listQrCodes(identity, { query, tag });
    const host = publicHost();

    return json({
      qr_codes: codes.map((code) => v4QrCode(code, host)),
      total: codes.length,
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const identity = await authenticate(request, "qr:write");

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ message: "The body must be JSON.", code: "INVALID_REQUEST" }, 400);
    }

    const longUrl = requireString(body, "long_url");
    const backHalf = optionalString(body, "custom_back_half");
    const title = optionalString(body, "title");
    const tags = optionalStringArray(body, "tags");
    const expiresAt = optionalString(body, "expires_at");
    const linkId = optionalString(body, "link_id");

    const design =
      body.design && typeof body.design === "object"
        ? (body.design as Record<string, unknown>)
        : undefined;

    const created = await createQrCode(identity, {
      longUrl,
      code: backHalf,
      title,
      tags,
      design,
      linkId: linkId ?? null,
      expiresAt: expiresAt ?? null,
    });

    // The insert returns the raw row. The shaped one comes from the same
    // read the list uses, so both answers agree.
    const made = await getQrCode(identity, created.id);
    if (!made) {
      return json({ message: "That code no longer exists.", code: "NOT_FOUND" }, 404);
    }
    return json(v4QrCode(made, publicHost()), 201);
  });
}
