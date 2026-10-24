import { getCtx, listApiKeys } from "@steadlink/data";
import { Badge, Button, Card } from "@steadlink/ui";
import { Plus } from "lucide-react";

import { ApiKeyDialog } from "@/components/settings/api-key-dialog";

import { formatRelative } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ApiPage() {
  const ctx = await getCtx();
  const keys = await listApiKeys(ctx);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">API</h1>
          <p className="mt-1 text-sm text-muted">
            Personal access tokens for the REST API. A token can be revoked at any time.
          </p>
        </div>
        <ApiKeyDialog
          trigger={
            <Button>
              <Plus aria-hidden="true" className="size-4" />
              New token
            </Button>
          }
        />
      </div>

      {keys.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted">No tokens yet.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {keys.map((key) => (
            <Card key={key.id} className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-foreground">{key.name}</h2>
                  <p className="mt-1 font-mono text-xs text-muted">
                    {key.prefix}… — the rest is shown only once
                  </p>
                </div>
                <Badge tone="neutral">{key.scopes.join(", ") || "full access"}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted">
                Last used {key.lastUsedAt ? formatRelative(key.lastUsedAt) : "never"}.
              </p>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground">The endpoint</h2>
        <pre className="mt-3 overflow-x-auto rounded-md bg-accent p-4 text-sm text-accent-foreground">
          <code>
            curl -H &quot;Authorization: Bearer gl_…&quot; https://go.arjav.is-cool.dev/api/v4/links
          </code>
        </pre>
        <p className="mt-3 text-sm text-muted">
          The API follows the same shape as the public v4 reference: links, QR codes, pages, groups
          and campaigns. Webhooks tell you when something changes.
        </p>
      </Card>
    </div>
  );
}
