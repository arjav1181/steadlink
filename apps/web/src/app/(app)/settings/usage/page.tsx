import { getCtx, getUsage } from "@steadlink/data";

import { Button, Card } from "@steadlink/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function UsagePage() {
  const ctx = await getCtx();
  const { usage } = await getUsage(ctx);

  const rows = [
    { label: "Links", value: usage.links },
    { label: "QR codes", value: usage.qrCodes },
    { label: "Pages", value: usage.pages },
    { label: "Custom back-halves", value: usage.backHalves },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Usage</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Steadlink is free and self-hosted. These are counts of what is in the workspace, not a
          quota: nothing here is metered, and there is nothing to buy.
        </p>
      </div>

      <Card className="p-6">
        <dl className="space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-3">
              <dt className="text-sm text-muted">{row.label}</dt>
              <dd className="text-sm font-semibold tabular-nums text-foreground">
                {row.value.toLocaleString("en-US")}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground">Leaving</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Every link in the workspace downloads as a CSV, with its destination, title, click count
          and state. It is a button, not a support ticket.
        </p>
        <div className="mt-4">
          <Button variant="secondary" asChild>
            <Link href="/settings/export">Download the CSV</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
