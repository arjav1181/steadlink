import { getCtx, listLinks } from "@steadlink/data";

import { Card } from "@steadlink/ui";

export const dynamic = "force-dynamic";

export default async function DeeplinksPage() {
  const ctx = await getCtx();
  const { links } = await listLinks(ctx, { state: "all", limit: 100, groupId: ctx.groupId });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mobile deep links</h1>
        <p className="mt-1 text-sm text-muted">
          When a deep link is set on a link, the address opens your app instead of the website, and
          falls back to the install page when the app is not installed.
        </p>
      </div>

      <Card className="p-6">
        {links.length === 0 ? (
          <p className="text-sm text-muted">No links yet.</p>
        ) : (
          <ul className="space-y-2">
            {links.map((link) => (
              <li
                key={link.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3 text-sm"
              >
                <span className="font-mono text-xs text-muted">/{link.code}</span>
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {link.title ?? link.longUrl}
                </span>
                <span className="text-xs text-subtle">Set a deep link from the link page</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
