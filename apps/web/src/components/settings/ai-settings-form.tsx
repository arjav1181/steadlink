"use client";

import { Button, Field, Select, TextInput, Toggle } from "@golink/ui";
import { useRouter } from "next/navigation";
import * as React from "react";

import { saveAiSettingsAction } from "@/app/actions";

export function AiSettingsForm({
  provider: initialProvider,
  baseUrl: initialBaseUrl,
  model: initialModel,
  enabled: initialEnabled,
}: {
  provider: string;
  baseUrl: string | null;
  model: string | null;
  enabled: boolean;
}) {
  const router = useRouter();
  const [provider, setProvider] = React.useState(initialProvider);
  const [baseUrl, setBaseUrl] = React.useState(initialBaseUrl ?? "");
  const [model, setModel] = React.useState(initialModel ?? "");
  const [enabled, setEnabled] = React.useState(initialEnabled);
  const [saved, setSaved] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await saveAiSettingsAction({
      provider,
      baseUrl: baseUrl.trim() || null,
      model: model.trim() || null,
      enabled,
    });
    setBusy(false);
    setSaved(result.ok);
    if (result.ok) router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label="Provider" htmlFor="ai-provider">
        <Select
          id="ai-provider"
          label="Provider"
          value={provider}
          onValueChange={setProvider}
          options={[
            { value: "none", label: "Off" },
            { value: "openai", label: "OpenAI-compatible" },
            { value: "ollama", label: "Ollama (local)" },
          ]}
        />
      </Field>
      {provider !== "none" ? (
        <>
          <Field
            label="Base URL"
            htmlFor="ai-base-url"
            hint="For OpenAI this is the API base. For Ollama it is usually http://localhost:11434"
          >
            <TextInput
              id="ai-base-url"
              mono
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://api.openai.com/v1"
            />
          </Field>
          <Field label="Model" htmlFor="ai-model">
            <TextInput
              id="ai-model"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="gpt-4o-mini"
            />
          </Field>
        </>
      ) : null}
      <div className="rounded-md border border-border bg-surface-2 p-4">
        <Toggle
          label="Let the assistant answer questions"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" loading={busy}>
          Save settings
        </Button>
        {saved ? (
          <p role="status" className="text-sm text-success">
            Saved.
          </p>
        ) : null}
      </div>
    </form>
  );
}
