import { getCtx, getPage, getPageMetrics, rangeFromDays } from "@golink/data";
import { Badge, Card, StatCard } from "@golink/ui";
import { ArrowLeft, ExternalLink, GripVertical } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageBlockEditor } from "@/components/pages/page-block-editor";
import { PagePublish } from "@/components/pages/page-publish";

import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PageBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCtx();
  const page = await getPage(ctx, id);
  if (!page) notFound();

  const metrics = await getPageMetrics(ctx, id, rangeFromDays(30));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/pages"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          All pages
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{page.title}</h1>
              <Badge
                tone={
                  page.status === "published"
                    ? "success"
                    : page.status === "scheduled"
                      ? "warning"
                      : "neutral"
                }
              >
                {page.status}
              </Badge>
            </div>
            <p className="mt-1 flex items-center gap-2 text-sm">
              <a
                href={`/p/${page.slug}`}
                target="_blank"
                rel="noreferrer noopener"
                className="font-mono text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                /p/{page.slug}
                <ExternalLink aria-hidden="true" className="ml-1 inline size-3.5" />
              </a>
            </p>
          </div>
          <PagePublish pageId={page.id} status={page.status} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Views" value={formatNumber(metrics.views)} />
        <StatCard label="Block clicks" value={formatNumber(metrics.clicks)} />
        <StatCard label="Top block" value={metrics.topBlocks[0]?.title ?? "—"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">Blocks</h2>
              <span className="text-sm text-muted">
                {page.blocks.length} {page.blocks.length === 1 ? "block" : "blocks"}
              </span>
            </div>
            {page.blocks.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                This page is empty. Add a text block to start, then a link or a grid.
              </p>
            ) : (
              <ol className="mt-4 space-y-2">
                {page.blocks.map((block) => (
                  <li
                    key={block.id}
                    className="flex items-center gap-3 rounded-md border border-border p-3"
                  >
                    <GripVertical aria-hidden="true" className="size-4 shrink-0 text-muted" />
                    <span className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-muted">
                      {block.type}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {String(
                        block.config.title ??
                          block.config.heading ??
                          block.config.name ??
                          block.type,
                      )}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-muted">
                      {formatNumber(
                        metrics.topBlocks.find((top) => top.id === block.id)?.clicks ?? 0,
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <PageBlockEditor pageId={page.id} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground">Preview</h2>
            <p className="mt-1 text-sm text-muted">How it looks on a phone.</p>
            <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface-3">
              <div className="mx-auto max-w-[220px] space-y-3 p-4">
                {page.blocks.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted">Nothing to show yet.</p>
                ) : (
                  page.blocks.map((block) => (
                    <div key={block.id} className="rounded-md border border-border bg-surface p-3">
                      <p className="truncate text-xs font-medium text-foreground">
                        {String(
                          block.config.title ??
                            block.config.heading ??
                            block.config.name ??
                            block.type,
                        )}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground">What people clicked</h2>
            {metrics.topBlocks.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No clicks on this page yet.</p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {metrics.topBlocks.map((block) => (
                  <li key={block.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-muted">{block.title}</span>
                    <span className="shrink-0 tabular-nums text-foreground">{block.clicks}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
