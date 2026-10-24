"use client";

import { Button, Field, Modal, TextInput } from "@steadlink/ui";
import { useRouter } from "next/navigation";
import * as React from "react";

import { createApiKeyAction } from "@/app/actions";
import { Trigger } from "@/components/ui/trigger";

export function ApiKeyDialog({
  trigger,
}: {
  trigger: React.ReactElement<{ onClick?: () => void }>;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [issued, setIssued] = React.useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const result = await createApiKeyAction(name.trim(), ["links:write", "links:read"]);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "That token could not be created.");
      return;
    }
    setIssued(result.token ?? null);
    router.refresh();
  }

  return (
    <>
      <Trigger trigger={trigger} onClick={() => setOpen(true)} />
      <Modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setIssued(null);
            setName("");
          }
        }}
        title="New API token"
        description="The token is shown once. Copy it now."
        footer={
          issued ? (
            <Button onClick={() => setOpen(false)}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submit} loading={busy}>
                Create the token
              </Button>
            </>
          )
        }
      >
        {issued ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Here is your token. This is the only time it is shown.
            </p>
            <pre className="overflow-x-auto rounded-md bg-accent p-4 font-mono text-sm break-all text-accent-foreground">
              {issued}
            </pre>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Field label="Name" htmlFor="key-name" required hint="What will use this token?">
              <TextInput
                id="key-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="CI publish"
                required
              />
            </Field>
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
          </form>
        )}
      </Modal>
    </>
  );
}
