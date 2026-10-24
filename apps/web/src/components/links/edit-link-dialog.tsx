"use client";

import { Button, Field, Modal, TextInput } from "@steadlink/ui";
import { useRouter } from "next/navigation";
import * as React from "react";

import { changeBackHalfAction, updateLinkAction } from "@/app/actions";

export interface EditableLink {
  id: string;
  code: string;
  title: string | null;
  longUrl: string;
  tags: string[];
  domainHost: string;
}

/**
 * The edit dialog (S14). The back-half field is a separate action from the
 * rest, because changing it mints a new link rather than editing this one.
 */
export function EditLinkDialog({
  link,
  open,
  onOpenChange,
}: {
  link: EditableLink;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState(link.title ?? "");
  const [longUrl, setLongUrl] = React.useState(link.longUrl);
  const [tags, setTags] = React.useState(link.tags.join(", "));
  const [code, setCode] = React.useState(link.code);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setTitle(link.title ?? "");
    setLongUrl(link.longUrl);
    setTags(link.tags.join(", "));
    setCode(link.code);
    setError(null);
  }, [link]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const saved = await updateLinkAction(link.id, {
      title: title.trim(),
      longUrl: longUrl.trim(),
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    if (!saved.ok) {
      setError(saved.error ?? "That change could not be saved.");
      setBusy(false);
      return;
    }

    if (code.trim() && code.trim() !== link.code) {
      const changed = await changeBackHalfAction(link.id, code.trim());
      if (!changed.ok) {
        setError(changed.error ?? "That back-half could not be changed.");
        setBusy(false);
        return;
      }
    }

    setBusy(false);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit link"
      description="Changing the back-half makes a new link. The old one keeps working."
      width="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            Save changes
          </Button>
        </>
      }
    >
      <form onSubmit={save} className="space-y-4">
        <Field label="Title" htmlFor="edit-title" hint="Only you see this.">
          <TextInput
            id="edit-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>

        <Field label="Destination URL" htmlFor="edit-url" required>
          <TextInput
            id="edit-url"
            type="url"
            value={longUrl}
            onChange={(event) => setLongUrl(event.target.value)}
            required
          />
        </Field>

        <Field
          label="Back-half"
          htmlFor="edit-code"
          hint={`Currently ${link.domainHost}/${link.code}. The old address keeps working.`}
        >
          <TextInput
            id="edit-code"
            mono
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </Field>

        <Field label="Tags" htmlFor="edit-tags" hint="Separate with commas.">
          <TextInput
            id="edit-tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
          />
        </Field>

        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
