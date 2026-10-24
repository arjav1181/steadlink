import { getCtx, listQrCodes, listQrTemplates } from "@steadlink/data";
import { Badge, Button, Card, EmptyState, QrPreview, Tag as TagChip } from "@steadlink/ui";
import { Plus, QrCode } from "lucide-react";
import Link from "next/link";

import { QrDesigner } from "@/components/qr/qr-designer";

import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function QrCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const ctx = await getCtx();
  const params = await searchParams;
  const [codes, templates] = await Promise.all([
    listQrCodes(ctx, { groupId: ctx.groupId }),
    listQrTemplates(ctx),
  ]);

  if (params.new === "1") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">New QR code</h1>
        <QrDesigner
          defaultUrl="https://acme.studio/"
          templates={templates.map((template) => ({
            id: template.id as string,
            name: template.name as string,
            design: (template.design ?? {}) as Record<string, unknown>,
          }))}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">QR codes</h1>
          <p className="mt-1 text-sm text-muted">
            Codes for print, packaging and anywhere a URL will not fit. Restyle one without
            reprinting it.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" asChild>
            <Link href="/qr/templates">Designs</Link>
          </Button>
          <Button asChild>
            <Link href="/qr?new=1">
              <Plus aria-hidden="true" className="size-4" />
              New QR code
            </Link>
          </Button>
        </div>
      </div>

      {codes.length === 0 ? (
        <EmptyState
          icon={<QrCode aria-hidden="true" />}
          title="No QR codes yet"
          body="A code points at a link you already have, or at a page of its own. Where it points can change later; the code on the sheet does not."
          action={
            <Button asChild>
              <Link href="/qr?new=1">Make a QR code</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {codes.map((qr) => (
            <Card key={qr.id} className="p-5">
              <Link
                href={`/qr/${qr.id}`}
                className="flex flex-col items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <QrPreview
                  text={`https://go.arjav.is-cool.dev/${qr.code}`}
                  design={qr.design}
                  size={148}
                />
                <span className="w-full text-center">
                  <span className="block truncate font-medium text-foreground">
                    {qr.title ?? qr.code}
                  </span>
                  <span className="mt-0.5 block font-mono text-xs text-muted">/{qr.code}</span>
                </span>
              </Link>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-sm text-muted">
                  <span className="font-semibold text-foreground">
                    {formatNumber(qr.scanCountTotal ?? 0)}
                  </span>{" "}
                  scans
                </span>
                {qr.expiresAt && new Date(qr.expiresAt).getTime() < Date.now() ? (
                  <Badge tone="warning">Expired</Badge>
                ) : qr.link ? (
                  <Badge tone="success">Linked</Badge>
                ) : (
                  <Badge tone="neutral">Standalone</Badge>
                )}
              </div>
              {qr.tags.length ? (
                <p className="mt-2 flex flex-wrap gap-1">
                  {qr.tags.map((tag) => (
                    <TagChip key={tag}>{tag}</TagChip>
                  ))}
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
