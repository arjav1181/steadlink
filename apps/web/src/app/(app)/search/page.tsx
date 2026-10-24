import { getCtx, search } from "@steadlink/data";
import { Badge, Card, EmptyState, Tag as TagChip } from "@steadlink/ui";
import { Link2, QrCode } from "lucide-react";
import Link from "next/link";

import { formatNumber, linkStateLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const ctx = await getCtx();
  const query = (q ?? "").trim();
  const results = query ? await search(ctx, query) : { links: [], qrCodes: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {query ? `Results for “${query}”` : "Search"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {query
            ? `${results.links.length} links and ${results.qrCodes.length} QR codes matched.`
            : "Type something in the search box above."}
        </p>
      </div>

      {!query ? (
        <EmptyState
          icon={<Link2 aria-hidden="true" />}
          title="Nothing to search yet"
          body="Search by title, back-half, destination or tag. Every result is scoped to your workspace."
        />
      ) : results.links.length === 0 && results.qrCodes.length === 0 ? (
        <EmptyState
          icon={<Link2 aria-hidden="true" />}
          title="No matches"
          body="Try a shorter term, or search for a fragment of the destination URL."
          action={<ButtonLink href="/links">Back to all links</ButtonLink>}
        />
      ) : (
        <div className="space-y-6">
          {results.links.length > 0 ? (
            <Card className="p-0">
              <h2 className="border-b border-border px-5 py-3 text-sm font-semibold text-foreground">
                Links
              </h2>
              <ul className="divide-y divide-border">
                {results.links.map((link) => (
                  <li key={link.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/links/${link.id}`}
                        className="font-medium text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        {link.title ?? link.code}
                      </Link>
                      <Badge
                        tone={
                          linkStateLabel(link) === "Active"
                            ? "success"
                            : linkStateLabel(link) === "Expired"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {linkStateLabel(link)}
                      </Badge>
                      <span className="ml-auto text-sm tabular-nums text-muted">
                        {formatNumber(link.clickCount)} clicks
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted">{link.code}</p>
                    <p className="mt-0.5 truncate text-xs text-subtle">{link.longUrl}</p>
                    {link.tags.length ? (
                      <p className="mt-1.5 flex flex-wrap gap-1">
                        {link.tags.map((tag) => (
                          <TagChip key={tag}>{tag}</TagChip>
                        ))}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {results.qrCodes.length > 0 ? (
            <Card className="p-0">
              <h2 className="flex items-center gap-2 border-b border-border px-5 py-3 text-sm font-semibold text-foreground">
                <QrCode aria-hidden="true" className="size-4 text-muted" />
                QR codes
              </h2>
              <ul className="divide-y divide-border">
                {results.qrCodes.map((qr) => (
                  <li key={qr.id} className="flex items-center gap-3 px-5 py-3">
                    <Link
                      href={`/qr/${qr.id}`}
                      className="font-medium text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {qr.title ?? qr.code}
                    </Link>
                    <span className="ml-auto font-mono text-xs text-muted">/{qr.code}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ButtonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center rounded-md border border-input bg-surface px-4 text-sm font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {children}
    </Link>
  );
}
