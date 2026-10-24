import { getCtx, getUsage } from "@steadlink/data";

import { Card, UsageBar } from "@steadlink/ui";

export const dynamic = "force-dynamic";

export default async function UsagePage() {
  const ctx = await getCtx();
  const { plan, usage } = await getUsage(ctx);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing and usage</h1>
        <p className="mt-1 text-sm text-muted">
          Steadlink is free and self-hosted. These limits are the ones your operator set, not a
          subscription.
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">{plan.name} plan</h2>
          <span className="text-sm text-muted">No invoices, no card</span>
        </div>
        <div className="mt-5 space-y-5">
          <UsageBar label="Links" used={usage.links} limit={plan.limits.links} />
          <UsageBar label="QR codes" used={usage.qrCodes} limit={plan.limits.qrCodes} />
          <UsageBar label="Pages" used={usage.pages} limit={plan.limits.pages} />
          <UsageBar
            label="Custom back-halves"
            used={usage.backHalves}
            limit={plan.limits.backHalves}
          />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground">What the plan includes</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {Object.entries(plan.features).map(([feature, enabled]) => (
            <li key={feature} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={
                  enabled ? "size-1.5 rounded-pill bg-success" : "size-1.5 rounded-pill bg-border"
                }
              />
              <span className={enabled ? "text-foreground" : "text-muted"}>
                {feature.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
