import { getCtx, listActivity } from "@steadlink/data";

import { Card } from "@steadlink/ui";

import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const ctx = await getCtx();
  const entries = await listActivity(ctx, 50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Activity</h1>
        <p className="mt-1 text-sm text-muted">What happened in this workspace, newest first.</p>
      </div>

      <Card className="p-0">
        {entries.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">Nothing has happened yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-2 px-5 py-3 text-sm">
                <span className="font-medium text-foreground">
                  {entry.action.replace(/[._]/g, " ")}
                </span>
                {entry.metadata && Object.keys(entry.metadata).length > 0 ? (
                  <span className="font-mono text-xs text-muted">
                    {Object.entries(entry.metadata)
                      .map(([key, value]) => `${key}: ${String(value)}`)
                      .join(", ")}
                  </span>
                ) : null}
                <span className="ml-auto text-xs text-subtle">
                  {formatDateTime(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
