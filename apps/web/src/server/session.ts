/**
 * The session, from the request.
 *
 * The data layer asks who the caller is; this is the answer for the web
 * application.
 *
 * better-auth owns the session: it signs the cookie, it checks the
 * signature, and it knows when the session expires. So the answer comes
 * from better-auth and not from a query of our own — a query would have to
 * verify the signature as well, and getting that wrong is a way in.
 */

import { getAuth } from "@steadlink/auth";
import { setSessionReader } from "@steadlink/data";
import { cookies, headers } from "next/headers";

/**
 * The cookie that says which group the person is working in.
 *
 * It is a cookie rather than a column because the group is a working
 * context, not a property of the account: two people can be in the same
 * workspace and in different groups at the same time, and switching
 * groups should not change what the account is.
 */
export const GROUP_COOKIE = "steadlink.group";

setSessionReader(async () => {
  const result = await getAuth().api.getSession({ headers: await headers() });
  const user = result?.user as { id?: string } | undefined;
  if (!user?.id) return null;
  const session = result?.session as { activeOrganizationId?: string | null } | undefined;
  const jar = await cookies();
  return {
    userId: user.id,
    organizationId: session?.activeOrganizationId ?? null,
    groupId: jar.get(GROUP_COOKIE)?.value ?? null,
  };
});
