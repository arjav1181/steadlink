/**
 * Who the token belongs to.
 *
 * `GET /api/v4/user` answers with the person who owns the token and the
 * workspace it points at. It is the call a script makes first, to find out
 * which workspace it is acting on.
 */

import { getProfile } from "@steadlink/data";

import { authenticate } from "@/server/api-auth";
import { handle, json } from "@/server/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    const identity = await authenticate(request);
    const profile = await getProfile(identity);

    const user = profile.user as Record<string, unknown> | null;
    const org = profile.org as Record<string, unknown> | null;

    return json({
      id: user?.id ?? identity.userId,
      login: user?.email ?? null,
      name: user?.name ?? null,
      email: user?.email ?? null,
      email_verified: user?.emailVerified ?? user?.email_verified ?? false,
      created_at: user?.createdAt ?? user?.created_at ?? null,
      organization: org
        ? {
            id: org.id,
            name: org.name,
            slug: org.slug,
            timezone: org.timezone,
          }
        : null,
      token: {
        id: identity.keyId,
        name: identity.keyName,
        scopes: identity.scopes,
      },
    });
  });
}
