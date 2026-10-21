import { renderQrSvg } from "@golink/ui";
import { NextResponse } from "next/server";

/**
 * The code as SVG. The path carries the code, not an id, so a printed code
 * can be re-fetched at any time without looking anything up.
 */
export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const svg = renderQrSvg({
    text: `https://go.arjav.is-cool.dev/${code}`,
    size: 512,
    title: `QR code for ${code}`,
  });
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=300",
    },
  });
}
