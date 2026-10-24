import { getCtx, listPages, listPageTemplates } from "@steadlink/data";
import { Badge, Button, Card, EmptyState } from "@steadlink/ui";
import { ArrowRight, FileText, Plus } from "lucide-react";
import Link from "next/link";

import { PageCreator } from "@/components/pages/page-creator";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_TONE = {
  draft: "neutral",
  published: "success",
  scheduled: "warning",
} as const;

export default async function PagesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; template?: string }>;
}) {
  const ctx = await getCtx();
  const params = await searchParams;
  const [pages, templates] = await Promise.all([listPages(ctx), listPageTemplates()]);

  if (params.new === "1") {
    // A template was chosen: the builder opens straight away, with the
    // template's blocks already in it.
    const chosen = params.template
      ? templates.find((template) => template.id === params.template)
      : undefined;
    if (chosen) {
      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-foreground">New page</h1>
          <PageCreator templateId={chosen.id} templateName={chosen.name} />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">New page</h1>
        <PageTemplateGallery templates={templates} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pages</h1>
          <p className="mt-1 text-sm text-muted">
            A landing page you can point a link or a QR code at. It has its own numbers.
          </p>
        </div>
        <Button asChild>
          <Link href="/pages?new=1">
            <Plus aria-hidden="true" className="size-4" />
            New page
          </Link>
        </Button>
      </div>

      {pages.length === 0 ? (
        <EmptyState
          icon={<FileText aria-hidden="true" />}
          title="No pages yet"
          body="Start from a template, drop in a few links, and publish it. It works on any screen."
          action={
            <Button asChild>
              <Link href="/pages?new=1">Make a page</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <Card key={page.id} className="p-0">
              <Link
                href={`/pages/${page.id}`}
                className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <div className="flex h-32 items-center justify-center rounded-t-lg bg-surface-2">
                  <span className="text-3xl font-bold text-subtle">{page.title.slice(0, 1)}</span>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="truncate font-semibold text-foreground">{page.title}</h2>
                    <Badge tone={STATUS_TONE[page.status]}>{page.status}</Badge>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted">/p/{page.slug}</p>
                  <p className="mt-2 text-sm text-muted">
                    <span className="font-semibold text-foreground">
                      {formatNumber(page.views)}
                    </span>{" "}
                    views
                  </p>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PageTemplateGallery({
  templates,
}: {
  templates: { id: string; name: string; category: string }[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <Card key={template.id} className="p-5">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            {template.category}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">{template.name}</h2>
          <Link
            href={`/pages?new=1&template=${template.id}`}
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
          >
            Use this template
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Card>
      ))}
    </div>
  );
}
