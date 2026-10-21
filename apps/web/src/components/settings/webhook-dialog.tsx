"use client";

import { Button, Field, Modal, Select, TextInput, Toggle } from "@golink/ui";
import { useRouter } from "next/navigation";
import * as React from "react";

import { createWebhookAction } from "@/app/actions";
import { Trigger } from "@/components/ui/trigger";

const EVENTS = [
  { value: "engagement", label: "Engagement (every click and scan)" },
  { value: "link.created", label: "Link created" },
  { value: "link.updated", label: "Link updated" },
  { value: "qr.created", label: "QR code created" },
  { value: "page.published", label: "Page published" },
  { value: "campaign.created", label: "Campaign created" },
];

export function WebhookDialog({
  trigger,
}: {
  trigger: React.ReactElement<{ onClick?: () => void }>;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [event, setEvent] = React.useState("engagement");
  const [url, setUrl] = React.useState("");
  const [fetchTags, setFetchTags] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);
    setBusy(true);
    const result = await createWebhookAction({
      name: name.trim(),
      event,
      url: url.trim(),
      authType: "hmac",
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "That webhook could not be created.");
      return;
    }
    setOpen(false);
    setName("");
    setUrl("");
    router.refresh();
  }

  return (
    <>
      <Trigger trigger={trigger} onClick={() => setOpen(true)} />
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="New webhook"
        description="We sign every request with HMAC-SHA256. The signature travels in the X-GoLink-Signature header."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={busy}>
              Create the webhook
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <Field label="Name" htmlFor="hook-name" required>
            <TextInput
              id="hook-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Engagement stream"
              required
            />
          </Field>
          <Field label="Event" htmlFor="hook-event">
            <Select
              id="hook-event"
              label="Event"
              value={event}
              onValueChange={setEvent}
              options={EVENTS}
            />
          </Field>
          <Field label="URL" htmlFor="hook-url" required hint="Must be HTTPS.">
            <TextInput
              id="hook-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://hooks.example.com/golink"
              required
            />
          </Field>
          <div className="rounded-md border border-border bg-surface-2 p-4">
            <Toggle
              label="Include the link's tags"
              checked={fetchTags}
              onCheckedChange={setFetchTags}
            />
            <p className="mt-2 text-xs text-muted">
              Tags are gathered on our side first, so the first few deliveries can lag.
            </p>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
        </form>
      </Modal>
    </>
  );
}
