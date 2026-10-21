"use client";

import { Button, Field, Modal, TextInput } from "@golink/ui";
import { useRouter } from "next/navigation";
import * as React from "react";

import { createCampaignAction } from "@/app/actions";
import { Trigger } from "@/components/ui/trigger";

export function CampaignDialog({
  channels,
  trigger,
}: {
  channels: string[];
  trigger: React.ReactElement<{ onClick?: () => void }>;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [channelText, setChannelText] = React.useState(channels.join(", "));
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const result = await createCampaignAction(
      name.trim(),
      channelText
        .split(",")
        .map((channel) => channel.trim())
        .filter(Boolean),
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "That campaign could not be created.");
      return;
    }
    setOpen(false);
    setName("");
    router.refresh();
  }

  return (
    <>
      <Trigger trigger={trigger} onClick={() => setOpen(true)} />
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="New campaign"
        description="A campaign needs at least one channel. Channels become the UTM source on every link you add."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={busy}>
              Create the campaign
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <Field label="Name" htmlFor="campaign-name" required>
            <TextInput
              id="campaign-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Spring launch"
              required
            />
          </Field>
          <Field
            label="Channels"
            htmlFor="campaign-channels"
            required
            hint="Separate with commas. Each becomes a utm_source."
          >
            <TextInput
              id="campaign-channels"
              value={channelText}
              onChange={(event) => setChannelText(event.target.value)}
              placeholder="social, email, paid"
              required
            />
          </Field>
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
