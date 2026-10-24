"use client";

import { Button, Field, Modal, Select, TextInput, Toggle } from "@steadlink/ui";
import { useRouter } from "next/navigation";
import * as React from "react";

import { createLinkAction } from "@/app/actions";

export interface DomainOption {
  id: string;
  host: string;
  verificationStatus: string;
  isDefault: boolean;
}

/**
 * The create-link form. Used from the dashboard quick-create card and from
 * the links page, so it takes the field set as a prop: the dashboard shows
 * the short version, the dialog shows everything.
 */
export function CreateLinkForm({
  domains,
  compact = false,
  onCreated,
}: {
  domains: DomainOption[];
  compact?: boolean;
  onCreated?: (id: string) => void;
}) {
  const router = useRouter();
  const [longUrl, setLongUrl] = React.useState("");
  // The workspace's own domain is the one that works without any setup, so
  // it is the one the form starts on. A custom domain may still be waiting
  // for its DNS, and a link made on one of those does not resolve.
  const [domainId, setDomainId] = React.useState(
    domains.find((domain) => domain.isDefault)?.id ?? domains[0]?.id ?? "",
  );
  const [code, setCode] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [withQr, setWithQr] = React.useState(false);
  const [expiresAt, setExpiresAt] = React.useState("");
  const [advanced, setAdvanced] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!longUrl.trim()) {
      setError("Enter the address people should land on.");
      return;
    }
    setBusy(true);
    const result = await createLinkAction({
      longUrl: longUrl.trim(),
      domainId: domainId || undefined,
      code: code.trim() || undefined,
      title: title.trim() || undefined,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      createQr: withQr,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "That link could not be created.");
      return;
    }
    setLongUrl("");
    setCode("");
    setTitle("");
    setTags("");
    setWithQr(false);
    setExpiresAt("");
    onCreated?.(result.id ?? "");
    router.push(`/links/${result.id}`);
  }

  const host = domains.find((domain) => domain.id === domainId)?.host ?? "";

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Destination URL" htmlFor="create-long-url" required>
        <TextInput
          id="create-long-url"
          type="url"
          inputMode="url"
          placeholder="https://example.com/your-page"
          value={longUrl}
          onChange={(event) => setLongUrl(event.target.value)}
          required
        />
      </Field>

      {!compact ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Domain" htmlFor="create-domain">
              <Select
                id="create-domain"
                label="Domain"
                value={domainId}
                onValueChange={setDomainId}
                options={domains.map((domain) => ({
                  value: domain.id,
                  label: domain.isDefault ? domain.host : `${domain.host} (pending DNS)`,
                }))}
              />
            </Field>
            <Field label="Back-half" htmlFor="create-code" hint="Leave blank to generate one.">
              <TextInput
                id="create-code"
                mono
                placeholder="auto"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="create-title" hint="Only you see this.">
              <TextInput
                id="create-title"
                placeholder="Spring collection"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>
            <Field label="Tags" htmlFor="create-tags" hint="Separate with commas.">
              <TextInput
                id="create-tags"
                placeholder="launch, spring"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
              />
            </Field>
          </div>

          <div className="rounded-md border border-border bg-surface-2 p-4">
            <Toggle
              label="Also create a QR Code for this link"
              checked={withQr}
              onCheckedChange={setWithQr}
            />
          </div>
        </>
      ) : null}

      {advanced ? (
        <Field
          label="Expires"
          htmlFor="create-expires"
          hint="Between 5 minutes and 1 year from now."
        >
          <TextInput
            id="create-expires"
            type="datetime-local"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
          />
        </Field>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="submit" loading={busy}>
          Make the link
        </Button>
        {!compact ? (
          <Button type="button" variant="ghost" onClick={() => setAdvanced((open) => !open)}>
            {advanced ? "Fewer options" : "More options"}
          </Button>
        ) : null}
        {host && code ? (
          <p className="ml-auto font-mono text-xs text-muted">
            {host}/{code}
          </p>
        ) : null}
      </div>
    </form>
  );
}

/** The full create-link dialog (S12). */
export function CreateLinkDialog({
  open,
  onOpenChange,
  domains,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domains: DomainOption[];
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Create a short link"
      description="Give it a destination. Brand it later if you want."
      width="lg"
    >
      <CreateLinkForm domains={domains} onCreated={() => onOpenChange(false)} />
    </Modal>
  );
}
