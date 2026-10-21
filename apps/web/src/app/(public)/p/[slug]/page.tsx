import { getPageBySlug, recordPageView } from "@golink/data";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

function Block({ block }: { block: { type: string; config: Record<string, unknown> } }): ReactNode {
  switch (block.type) {
    case "text":
      return (
        <section className="px-6 pt-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">
            {String(block.config.heading ?? "")}
          </h1>
          {block.config.body ? (
            <p className="mx-auto mt-2 max-w-prose text-foreground/80">
              {String(block.config.body)}
            </p>
          ) : null}
        </section>
      );
    case "link":
      return (
        <div className="px-6 pt-6">
          <a
            href={String(block.config.url ?? "#")}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors duration-100 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="min-w-0">
              <span className="block truncate font-semibold text-foreground">
                {String(block.config.title ?? "")}
              </span>
              {block.config.subtitle ? (
                <span className="block truncate text-sm text-muted">
                  {String(block.config.subtitle)}
                </span>
              ) : null}
            </span>
            <span aria-hidden="true" className="text-muted">
              →
            </span>
          </a>
        </div>
      );
    case "button":
      return (
        <div className="px-6 pt-6 text-center">
          <a
            href={String(block.config.url ?? "#")}
            className="inline-flex h-11 items-center rounded-md bg-accent px-5 font-semibold text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {String(block.config.title ?? "Open")}
          </a>
        </div>
      );
    case "grid":
      return (
        <div className="grid grid-cols-2 gap-3 px-6 pt-6 sm:grid-cols-3">
          {((block.config.items as string[] | undefined) ?? []).map((item) => (
            <div key={item} className="rounded-lg border border-border bg-surface p-4 text-center">
              <p className="text-sm font-medium text-foreground">{item}</p>
            </div>
          ))}
        </div>
      );
    case "image":
      return (
        <div className="px-6 pt-6">
          <div
            role="img"
            aria-label={String(block.config.alt ?? "Image")}
            className="aspect-[4/3] w-full rounded-lg border border-border bg-surface-2"
          />
        </div>
      );
    case "youtube":
      return (
        <div className="px-6 pt-6">
          <div
            role="img"
            aria-label={String(block.config.title ?? "Video")}
            className="aspect-video w-full rounded-lg border border-border bg-surface-2"
          />
        </div>
      );
    case "divider":
      return <hr className="mx-6 mt-6 border-border" />;
    case "business_card":
      return (
        <div className="px-6 pt-6">
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="font-semibold text-foreground">{String(block.config.name ?? "")}</p>
            <p className="text-sm text-muted">{String(block.config.title ?? "")}</p>
          </div>
        </div>
      );
    default:
      return null;
  }
}

export default async function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page) notFound();

  const requestHeaders = await headers();
  void recordPageView(page.id, requestHeaders.get("user-agent"));

  const background =
    typeof page.appearance.background === "string" ? page.appearance.background : "#ffffff";

  return (
    <main className="min-h-screen" style={{ background }}>
      <div className="mx-auto max-w-lg py-10">
        {page.blocks.map((block) => (
          <Block key={block.id} block={block} />
        ))}
        <footer className="px-6 pt-10 pb-6 text-center text-xs text-foreground/50">
          <span>Made with GoLink</span>
        </footer>
      </div>
    </main>
  );
}
