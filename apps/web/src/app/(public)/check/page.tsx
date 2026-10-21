import { checkLink } from "@golink/data";
import { Badge, Button } from "@golink/ui";
import { ArrowRight, Link2, Search } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";

import { addressOf, take } from "@/server/rate-limit";

export const metadata = {
  title: "Check a short link — GoLink",
  description: "See where a short link points before you follow it.",
};

export const dynamic = "force-dynamic";

/** Checks per minute, per address. */
const LIMIT = 30;
const WINDOW_MS = 60_000;

const STATUS = {
  active: { tone: "success", label: "Active" },
  archived: { tone: "warning", label: "Retired" },
  expired: { tone: "warning", label: "Expired" },
  not_found: { tone: "danger", label: "Not found" },
} as const;

export default async function CheckPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const query = typeof params.code === "string" ? params.code.trim() : "";

  let result = null;
  let limited = false;

  if (query) {
    const limit = take(`check:${addressOf(await headers())}`, LIMIT, WINDOW_MS);
    if (limit.ok) {
      result = await checkLink(query);
    } else {
      limited = true;
    }
  }

  return (
    <main className="min-h-screen bg-bg px-gutter py-16">
      <div className="mx-auto max-w-2xl">
        <span className="flex size-11 items-center justify-center rounded-md bg-accent-soft">
          <Search aria-hidden="true" className="size-5 text-accent" />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-foreground">Where does this link go?</h1>
        <p className="mt-2 text-sm text-muted">
          Paste a short link and you will see the address it points at, without following it. You do
          not need an account.
        </p>

        <form method="get" action="/check" className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label htmlFor="check-code" className="sr-only">
              Short link or code
            </label>
            <input
              id="check-code"
              name="code"
              type="text"
              defaultValue={query}
              placeholder="acme.go.arjav.is-cool.dev/spring"
              autoComplete="off"
              spellCheck={false}
              className="h-11 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground placeholder:text-subtle focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </div>
          <Button type="submit" className="h-11">
            Check it
          </Button>
        </form>

        {limited ? (
          <p
            role="alert"
            className="mt-6 rounded-md border border-border bg-surface p-4 text-sm text-danger"
          >
            That is a lot of checks in a short time. Wait a moment and try again.
          </p>
        ) : null}

        {result ? (
          <section className="mt-8 rounded-lg border border-border bg-surface p-6 shadow-card">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground">
                {result.title ?? result.code}
              </h2>
              <Badge tone={STATUS[result.status].tone}>{STATUS[result.status].label}</Badge>
            </div>

            {result.status === "not_found" ? (
              <p className="mt-3 text-sm text-muted">
                There is no short link with that name here. Check the address for a typo, and
                remember that a short link is only found on the domain it was made on.
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted">
                  {result.host ? `${result.host}/${result.code}` : result.code}
                </p>
                <p className="mt-4 flex items-center gap-2 break-all font-mono text-sm text-foreground">
                  <Link2 aria-hidden="true" className="size-4 shrink-0 text-muted" />
                  {result.longUrl}
                </p>
                <a
                  href={result.longUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Open the destination
                  <ArrowRight aria-hidden="true" className="size-4" />
                </a>
              </>
            )}
          </section>
        ) : null}

        <p className="mt-10 text-sm text-muted">
          <Link href="/" className="font-semibold text-accent hover:underline">
            GoLink
          </Link>{" "}
          is a self-hosted short link service. This page only reads a link; it does not change one.
        </p>
      </div>
    </main>
  );
}
