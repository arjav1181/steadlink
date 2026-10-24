"use client";

import { Button, Card, type QrDesign, QrPreview } from "@steadlink/ui";
import { QrCode } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { formatNumber } from "@/lib/format";

export function LinkQrPanel({
  qrCode,
  linkId,
}: {
  qrCode: {
    id: string;
    code: string;
    design: QrDesign;
    scanCount: number;
    title: string | null;
  } | null;
  linkId: string;
}) {
  const router = useRouter();

  if (!qrCode) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground">QR code</h2>
        <p className="mt-1 text-sm text-muted">
          This link has no code yet. One is useful for print, packaging, or anywhere a URL will not
          fit.
        </p>
        <Button
          className="mt-4"
          variant="secondary"
          onClick={() => router.push(`/qr?new=1&link=${linkId}`)}
        >
          <QrCode aria-hidden="true" className="size-4" />
          Make a QR code
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">QR code</h2>
        <Link
          href={`/qr/${qrCode.id}`}
          className="text-sm font-semibold text-accent hover:underline"
        >
          Edit
        </Link>
      </div>
      <div className="mt-4 flex flex-col items-center">
        <QrPreview
          text={`https://go.arjav.is-cool.dev/${qrCode.code}`}
          design={qrCode.design}
          size={168}
        />
        <p className="mt-3 text-sm text-muted">
          <span className="font-semibold text-foreground">{formatNumber(qrCode.scanCount)}</span>{" "}
          scans
        </p>
      </div>
    </Card>
  );
}
