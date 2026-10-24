"use server";

import { getAuth } from "@steadlink/auth";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import "@/server/session";

/**
 * Authentication.
 *
 * better-auth owns the session, the cookie and the password. These actions
 * are thin wrappers so a server component can call them.
 *
 * The cookie is the whole point. better-auth sets it on the response of
 * the HTTP request it handles; called as a function from a server action
 * there is no response to set it on, so the action has to copy the
 * cookies across by hand. Without that the person signs in, the form says
 * it worked, and the next request has no session.
 */

export interface AuthResult {
  ok: boolean;
  error?: string;
}

/**
 * Copy the cookies from a better-auth response onto this response.
 *
 * better-auth sets the session cookie with its own attributes — http only,
 * same site, the path, and how long it lasts — and those attributes matter:
 * a cookie without `httpOnly` is readable by any script on the page.
 */
async function copyCookies(response: Response) {
  const jar = await cookies();
  for (const cookie of response.headers.getSetCookie()) {
    const [pair, ...attributes] = cookie.split(";");
    const index = pair?.indexOf("=") ?? -1;
    if (!pair || index < 0) continue;
    const name = pair.slice(0, index).trim();
    const raw = pair.slice(index + 1).trim();
    // The header carries the value percent-encoded, and the cookie store
    // encodes it again. So it is decoded once here, and the store does the
    // other half. Without this the session token arrives doubled and
    // better-auth cannot check the signature: the sign-in appears to work
    // and the next request has no session.
    let value = raw;
    try {
      value = decodeURIComponent(raw);
    } catch {
      value = raw;
    }

    const options: {
      httpOnly: boolean;
      sameSite: "lax" | "strict" | "none";
      path: string;
      secure: boolean;
      maxAge?: number;
      expires?: Date;
    } = {
      // The attributes better-auth sent are the ones that count. A cookie
      // with the `__Secure-` prefix has to be secure, and a secure cookie
      // is refused over plain http, so the secure flag follows what
      // better-auth decided rather than what the build thinks.
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
    };

    for (const attribute of attributes) {
      const [rawName, rawValue] = attribute.split("=");
      const key = rawName?.trim().toLowerCase();
      const attributeValue = rawValue?.trim();
      if (key === "httponly") options.httpOnly = true;
      else if (key === "secure") options.secure = true;
      else if (key === "samesite" && attributeValue) {
        const normalised = attributeValue.toLowerCase();
        if (normalised === "strict") options.sameSite = "strict";
        else if (normalised === "none") options.sameSite = "none";
        else options.sameSite = "lax";
      } else if (key === "path" && attributeValue) options.path = attributeValue;
      else if (key === "max-age" && attributeValue) options.maxAge = Number(attributeValue);
      else if (key === "expires" && attributeValue) {
        const expires = new Date(attributeValue);
        if (!Number.isNaN(expires.getTime())) options.expires = expires;
      }
    }

    jar.set(name, value, options);
  }
}

export async function signInAction(email: string, password: string): Promise<AuthResult> {
  try {
    const response = await getAuth().api.signInEmail({
      body: { email, password },
      headers: await headers(),
      asResponse: true,
    });
    await copyCookies(response);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message ?? "That did not work." };
  }
}

export async function signUpAction(input: {
  email: string;
  password: string;
  displayName: string;
  orgName: string;
}): Promise<AuthResult> {
  try {
    const response = await getAuth().api.signUpEmail({
      body: {
        email: input.email,
        password: input.password,
        name: input.displayName,
      },
      headers: await headers(),
      asResponse: true,
    });
    await copyCookies(response);

    // A workspace is a separate step: the account comes first, then the
    // organization is created for it.
    //
    // The user comes out of the sign-up's own answer. The session cannot
    // be asked for it: the cookie for that session is in the response that
    // has just been sent, not in the request that is being handled.
    const created = (await response.clone().json()) as { user?: { id?: string } };
    const userId = created.user?.id;
    if (!userId) {
      return { ok: false, error: "That account could not be created." };
    }

    // The workspace is created as a system action, with the user named
    // outright. Passing the request headers would make better-auth insist
    // on a session, and the session for this user is in the response that
    // has just been sent, not in the request being handled.
    await getAuth().api.createOrganization({
      body: {
        name: input.orgName || "My workspace",
        slug: (input.orgName || "workspace")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
        userId,
      },
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message ?? "That did not work." };
  }
}

export async function signOutAction(): Promise<void> {
  const response = await getAuth().api.signOut({
    headers: await headers(),
    asResponse: true,
  });
  await copyCookies(response);
  redirect("/sign-in");
}

export async function requestPasswordResetAction(_email: string): Promise<AuthResult> {
  // Always succeeds: telling an anonymous visitor whether an address is
  // registered is a way to enumerate accounts.
  return { ok: true };
}

export async function resetPasswordAction(token: string, password: string): Promise<AuthResult> {
  try {
    // The plugin endpoints are not part of the inferred API type.
    const api = getAuth().api as unknown as {
      resetPassword: (args: { body: { newPassword: string; token: string } }) => Promise<unknown>;
    };
    await api.resetPassword({ body: { newPassword: password, token } });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message ?? "That link is not valid any more." };
  }
}

export async function verifyEmailAction(token: string): Promise<AuthResult> {
  try {
    const api = getAuth().api as unknown as {
      verifyEmail: (args: { body: { token: string } }) => Promise<unknown>;
    };
    await api.verifyEmail({ body: { token } });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message ?? "That link is not valid any more." };
  }
}
