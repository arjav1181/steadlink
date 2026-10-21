"use client";

import { Button, Field, Modal, TextInput } from "@golink/ui";
import { useRouter } from "next/navigation";
import * as React from "react";

import { setPageStatusAction } from "@/app/actions";

export function PagePublish({ pageId, status }: { pageId: string; status: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [when, setWhen] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function publish() {
    setBusy(true);
    setError(null);
    const result = await setPageStatusAction(
      pageId,
      when ? "scheduled" : "published",
      when ? new Date(when).toISOString() : null,
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "The page could not be published.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex gap-2">
        <Button onClick={() => setOpen(true)}>
          {status === "published" ? "Publish again" : "Publish"}
        </Button>
        {status === "published" ? (
          <Button
            variant="secondary"
            onClick={async () => {
              await setPageStatusAction(pageId, "draft");
              router.refresh();
            }}
          >
            Unpublish
          </Button>
        ) : null}
      </div>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Publish this page"
        description="Leave the time blank to publish it now."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={publish} loading={busy}>
              {when ? "Schedule it" : "Publish it"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Publish at" htmlFor="page-when" hint="In your local time.">
            <TextInput
              id="page-when"
              type="datetime-local"
              value={when}
              onChange={(event) => setWhen(event.target.value)}
            />
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
