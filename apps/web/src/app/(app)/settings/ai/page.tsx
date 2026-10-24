import { getAiSettings, getCtx } from "@steadlink/data";

import { Card } from "@steadlink/ui";

import { AiSettingsForm } from "@/components/settings/ai-settings-form";

export const dynamic = "force-dynamic";

export default async function AiSettingsPage() {
  const ctx = await getCtx();
  const settings = await getAiSettings(ctx);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Assistant</h1>
        <p className="mt-1 text-sm text-muted">
          The assistant answers questions about your own click data. Point it at a model you trust,
          or leave it off.
        </p>
      </div>

      <Card className="p-6">
        <AiSettingsForm
          provider={settings.provider}
          baseUrl={settings.baseUrl}
          model={settings.model}
          enabled={settings.enabled}
        />
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground">What it can see</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          <li>Your own links, codes, pages and their click totals.</li>
          <li>Nothing from anyone else's workspace.</li>
          <li>No raw IP addresses, and no personal data beyond the click counts.</li>
        </ul>
      </Card>
    </div>
  );
}
