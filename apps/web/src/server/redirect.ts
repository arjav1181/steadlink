/**
 * The redirect hot path.
 *
 * The custom Node server (apps/web/server.ts) calls this before Next's
 * router, so a short link never touches React. The Next route handler at
 * app/[code]/route.ts is a fallback for deployments that run `next start`
 * without the custom server; both call the same functions.
 *
 * Rules that matter here:
 *   * the engagement write is never awaited before the response goes out
 *   * an expired or archived link does not redirect
 *   * 302, not 301, because a permanent redirect is cached forever and the
 *     destination would become unchangeable
 */

import { recordEngagement, resolveRedirect } from "@steadlink/data";

export interface RequestFacts {
  userAgent: string | null;
  referrer: string | null;
  countryCode: string | null;
  city: string | null;
  region: string | null;
  deviceType: string | null;
  os: string | null;
  browser: string | null;
}

const MOBILE = /iphone|android|mobile|windows phone/i;
const TABLET = /ipad|tablet/i;
const BROWSERS: [RegExp, string][] = [
  [/edg\//i, "Edge"],
  [/opr\//i, "Opera"],
  [/chrome|crios/i, "Chrome"],
  [/firefox|fxios/i, "Firefox"],
  [/safari/i, "Safari"],
  [/kindle/i, "Kindle"],
  [/roku/i, "Roku"],
];

function detectOs(userAgent: string | null): string | null {
  if (!userAgent) return null;
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/android/i.test(userAgent)) return "Android";
  if (/windows/i.test(userAgent)) return "Windows";
  if (/mac os|macintosh/i.test(userAgent)) return "macOS";
  if (/linux/i.test(userAgent)) return "Linux";
  if (/roku/i.test(userAgent)) return "Roku";
  return null;
}

function detectBrowser(userAgent: string | null): string | null {
  if (!userAgent) return null;
  for (const [pattern, name] of BROWSERS) {
    if (pattern.test(userAgent)) return name;
  }
  return null;
}

function detectDevice(userAgent: string | null): string | null {
  if (!userAgent) return null;
  if (/roku|smart-?tv|appletv/i.test(userAgent)) return "TV device";
  if (/kindle/i.test(userAgent)) return "Ebook reader";
  if (TABLET.test(userAgent)) return "Tablet";
  if (MOBILE.test(userAgent)) return "Mobile phone";
  return "Desktop";
}

export function factsFromHeaders(headers: Headers): RequestFacts {
  const userAgent = headers.get("user-agent");
  return {
    userAgent,
    referrer: headers.get("referer"),
    // A reverse proxy in front of the app usually supplies the country.
    countryCode: headers.get("x-country") ?? headers.get("cf-ipcountry"),
    city: headers.get("x-city"),
    region: headers.get("x-region"),
    deviceType: detectDevice(userAgent),
    os: detectOs(userAgent),
    browser: detectBrowser(userAgent),
  };
}

export type RedirectOutcome =
  | { kind: "redirect"; longUrl: string; code: string }
  | { kind: "expired" | "archived" | "not_found"; code: string };

export async function resolve(code: string, host?: string): Promise<RedirectOutcome> {
  const result = await resolveRedirect(code, host);
  if (result.kind === "redirect") {
    return { kind: "redirect", longUrl: result.longUrl, code };
  }
  return { kind: result.kind, code };
}

/** Record the click without blocking the caller. */
export function logEngagement(code: string, facts: RequestFacts): void {
  void recordEngagement({ code, ...facts }).catch(() => {
    // A failed analytics write must never break a redirect.
  });
}
