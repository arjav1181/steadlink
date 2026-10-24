"use client";

import { SegmentedControl } from "@steadlink/ui";
import { Link2, QrCode } from "lucide-react";
import * as React from "react";

import { CreateLinkForm, type DomainOption } from "./create-link-form";

/**
 * The dashboard quick-create card: a Short link / QR code toggle, and the
 * form for whichever is selected.
 */
export function QuickCreate({ domains }: { domains: DomainOption[] }) {
  const [mode, setMode] = React.useState("link");

  return (
    <div className="space-y-5">
      <SegmentedControl
        label="What to create"
        value={mode}
        onValueChange={setMode}
        options={[
          { value: "link", label: "Short link" },
          { value: "qr", label: "QR code" },
        ]}
      />

      {mode === "link" ? (
        <CreateLinkForm domains={domains} compact />
      ) : (
        <div className="rounded-md border border-dashed border-border bg-surface-2 p-6 text-center">
          <QrCode aria-hidden="true" className="mx-auto size-6 text-muted" />
          <p className="mt-2 text-sm font-medium text-foreground">Make a QR code</p>
          <p className="mt-1 text-sm text-muted">
            A code for a poster, a package, or a table card. It points at a link you already have,
            and you can restyle it whenever you like.
          </p>
          <a
            href="/qr"
            className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-accent px-3 text-sm font-semibold text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Link2 aria-hidden="true" className="size-4" />
            Open the QR code studio
          </a>
        </div>
      )}
    </div>
  );
}
