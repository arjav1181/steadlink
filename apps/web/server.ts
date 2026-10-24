/**
 * The custom Node server.
 *
 * It serves the Next app, and intercepts short links before Next's router
 * sees them, so the redirect path never touches React.
 *
 * Run it with:
 *   node --experimental-strip-types apps/web/server.ts
 *
 * Note: Next's `output: "standalone"` cannot be combined with a custom
 * server, so the Docker image ships node_modules and runs this file.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { RESERVED_CODES } from "@steadlink/data";
import next from "next";

import { factsFromHeaders, logEngagement, resolve } from "./src/server/redirect.ts";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3210);
const hostname = process.env.HOST ?? "0.0.0.0";

const app = next({ dev, hostname, port, turbopack: true });
const nextHandler = app.getRequestHandler();

await app.prepare();

const server = createServer(async (req, res) => {
  try {
    await handle(req, res);
  } catch (error) {
    // Without this the request never gets an answer and the client waits
    // until it gives up. A short link that cannot be resolved must fail,
    // not hang.
    console.error(`[steadlink] ${req.method} ${req.url} failed`, error);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    }
    res.end("That link could not be resolved.");
  }
});

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = req.url ?? "/";

  // A short link is a single path segment with no file extension and no
  // reserved prefix. Everything else goes to Next.
  if (req.method === "GET" && !url.includes(".") && !url.startsWith("/_next")) {
    const path = url.split("?")[0] ?? "/";
    const segment = path.slice(1);
    // A name the app owns is a route, never a short code.
    if (segment && !segment.includes("/") && !RESERVED_CODES.has(segment.toLowerCase())) {
      const outcome = await resolve(segment, req.headers.host);
      if (outcome.kind === "redirect") {
        logEngagement(
          segment,
          factsFromHeaders(new Headers(req.headers as Record<string, string>)),
        );
        res.writeHead(302, { Location: outcome.longUrl, "Cache-Control": "no-store" });
        res.end();
        return;
      }
      if (outcome.kind !== "not_found") {
        const reason = outcome.kind === "expired" ? "expired" : "archived";
        res.writeHead(302, { Location: `/gone?reason=${reason}` });
        res.end();
        return;
      }
    }
  }

  await nextHandler(req, res);
}

server.listen(port, hostname, () => {
  console.log(`Steadlink ready on http://${hostname}:${port} (${dev ? "dev" : "production"})`);
});
