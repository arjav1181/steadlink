import { getCtx, listWebhookDeliveries, listWebhooks } from "@steadlink/data";
import { Badge, Button, Card } from "@steadlink/ui";
import { Plus } from "lucide-react";

import { WebhookDialog } from "@/components/settings/webhook-dialog";

import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function WebhooksPage() {
  const ctx = await getCtx();
  const [hooks, deliveries] = await Promise.all([listWebhooks(ctx), listWebhookDeliveries(ctx)]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Webhooks</h1>
          <p className="mt-1 text-sm text-muted">
            Steadlink posts to your URL when something happens. Every request is signed.
          </p>
        </div>
        <WebhookDialog
          trigger={
            <Button>
              <Plus aria-hidden="true" className="size-4" />
              New webhook
            </Button>
          }
        />
      </div>

      {hooks.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted">
            No webhooks yet. Add one to receive click events in your own systems.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {hooks.map((hook) => (
            <Card key={hook.id} className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground">{hook.name}</h2>
                  <p className="mt-1 font-mono text-xs break-all text-muted">{hook.url}</p>
                  <p className="mt-2 text-sm text-muted">
                    Sends <span className="font-mono text-foreground">{hook.event}</span> events
                    {hook.fetchTags ? ", with tags" : ""}.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={hook.isActive ? "success" : "neutral"}>
                    {hook.isActive ? "Active" : "Paused"}
                  </Badge>
                  {hook.lastStatus ? (
                    <Badge tone={hook.lastStatus === 200 ? "success" : "danger"}>
                      {hook.lastStatus}
                    </Badge>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 font-mono text-xs text-subtle">
                Signing secret: {hook.secret.slice(0, 10)}…
              </p>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground">Recent deliveries</h2>
        {deliveries.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing has been delivered yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {deliveries.slice(0, 10).map((delivery) => (
              <li key={delivery.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-mono text-xs text-muted">{delivery.eventType}</span>
                <span className="text-xs text-subtle">{formatDateTime(delivery.createdAt)}</span>
                <span className="text-xs text-muted">
                  {delivery.responseStatus ? `${delivery.responseStatus} OK` : delivery.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
