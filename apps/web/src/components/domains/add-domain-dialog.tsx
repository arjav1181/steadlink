"use client";

import { Button, Field, Modal, TextInput } from "@golink/ui";
import { useRouter } from "next/navigation";
import * as React from "react";

import { addDomainAction } from "@/app/domain-actions";
import { Trigger } from "@/components/ui/trigger";

export function AddDomainDialog({
  trigger,
}: {
  trigger: React.ReactElement<{ onClick?: () => void }>;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [host, setHost] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const result = await addDomainAction(host.trim());
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "That domain could not be added.");
      return;
    }
    setOpen(false);
    setHost("");
    router.refresh();
  }

  return (
    <>
      <Trigger trigger={trigger} onClick={() => setOpen(true)} />
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Add a domain"
        description="We will give you two DNS records. Add them at your provider and the domain starts serving short links."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={busy}>
              Add the domain
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <Field
            label="Domain"
            htmlFor="domain-host"
            required
            hint="Without the scheme. For example acme.studio"
          >
            <TextInput
              id="domain-host"
              mono
              value={host}
              onChange={(event) => setHost(event.target.value)}
              placeholder="acme.studio"
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
