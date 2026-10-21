"use client";

import { Button, Field, Modal, TextInput } from "@golink/ui";
import { useRouter } from "next/navigation";
import * as React from "react";

import { createPageAction } from "@/app/actions";
import { Trigger } from "@/components/ui/trigger";

export function PageCreator({
  templateId,
  templateName,
  trigger,
}: {
  templateId?: string;
  templateName?: string;
  trigger?: React.ReactElement<{ onClick?: () => void }>;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(!trigger);
  const [title, setTitle] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const result = await createPageAction({ title: title.trim(), templateId });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "That page could not be created.");
      return;
    }
    setOpen(false);
    router.push(`/pages/${result.id}`);
  }

  return (
    <>
      {trigger ? <Trigger trigger={trigger} onClick={() => setOpen(true)} /> : null}
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={templateName ? `Start from “${templateName}”` : "New page"}
        description="You can change everything later."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={busy}>
              Create the page
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <Field label="Title" htmlFor="page-title" required>
            <TextInput
              id="page-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Betty Baker"
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
