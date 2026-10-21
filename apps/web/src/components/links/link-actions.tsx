"use client";

import { Button, Modal } from "@golink/ui";
import { Eye, EyeOff, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { deleteLinkAction, setLinkStateAction } from "@/app/actions";

import { type EditableLink, EditLinkDialog } from "./edit-link-dialog";

export function LinkActions({
  linkId,
  state,
  link,
}: {
  linkId: string;
  state: "Active" | "Hidden" | "Archived" | "Expired";
  link?: EditableLink;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    await action();
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex gap-2">
        {link ? (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil aria-hidden="true" className="size-4" />
            Edit
          </Button>
        ) : null}
        <Button
          variant="secondary"
          disabled={busy || state === "Archived"}
          onClick={() =>
            run(() => setLinkStateAction(linkId, state === "Hidden" ? "show" : "hide"))
          }
        >
          {state === "Hidden" ? (
            <Eye aria-hidden="true" className="size-4" />
          ) : (
            <EyeOff aria-hidden="true" className="size-4" />
          )}
          {state === "Hidden" ? "Show" : "Hide"}
        </Button>
      </div>

      {link ? <EditLinkDialog link={link} open={editing} onOpenChange={setEditing} /> : null}

      <Modal
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete this link?"
        description="The address stops working immediately and the click history goes with it. This cannot be undone."
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() => run(() => deleteLinkAction(linkId)).then(() => router.push("/links"))}
            >
              Delete the link
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          If you only want to stop showing it in your list, hide it instead. Hidden links keep
          working and keep their numbers.
        </p>
      </Modal>
    </>
  );
}
