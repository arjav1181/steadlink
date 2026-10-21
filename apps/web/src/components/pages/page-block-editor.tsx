"use client";

import { Button, Field, Modal, Select, TextInput } from "@golink/ui";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { addBlockAction, type BlockType } from "@/app/actions";

const TYPES = [
  { value: "text", label: "Text" },
  { value: "link", label: "Link" },
  { value: "button", label: "Button" },
  { value: "image", label: "Image" },
  { value: "grid", label: "Grid" },
  { value: "youtube", label: "YouTube" },
  { value: "divider", label: "Divider" },
  { value: "business_card", label: "Business card" },
];

export function PageBlockEditor({ pageId }: { pageId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState("link");
  const [title, setTitle] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const config: Record<string, unknown> = { title: title.trim() };
    if (url.trim()) config.url = url.trim();
    const result = await addBlockAction(pageId, type as BlockType, config);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "That block could not be added.");
      return;
    }
    setOpen(false);
    setTitle("");
    setUrl("");
    router.refresh();
  }

  return (
    <>
      <Button variant="secondary" className="mt-4" onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" className="size-4" />
        Add a block
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Add a block"
        description="Blocks stack in the order you add them. You can reorder them later."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={busy}>
              Add the block
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <Field label="Kind" htmlFor="block-type">
            <Select
              id="block-type"
              label="Kind"
              value={type}
              onValueChange={setType}
              options={TYPES}
            />
          </Field>
          <Field label="Text" htmlFor="block-title" required>
            <TextInput
              id="block-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Order a box"
              required
            />
          </Field>
          {type === "link" || type === "button" ? (
            <Field label="Where it goes" htmlFor="block-url" required>
              <TextInput
                id="block-url"
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://acme.studio/order"
                required
              />
            </Field>
          ) : null}
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
