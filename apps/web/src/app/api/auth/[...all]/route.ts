/**
 * better-auth's own endpoints.
 *
 * The sign-in and sign-up forms call the server actions directly, but
 * better-auth also answers over HTTP for the things a form cannot do: the
 * OAuth callback, the email verification link, the session check a client
 * SDK makes, and the sign-out a second tab triggers.
 *
 * The handler is built on first use, so a production build that imports
 * this route does not need the secret. The secret is needed when the
 * request arrives.
 */

import { getAuth } from "@golink/auth";

export const dynamic = "force-dynamic";

async function handle(request: Request): Promise<Response> {
  return getAuth().handler(request);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
