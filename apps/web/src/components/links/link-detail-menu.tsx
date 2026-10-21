"use client";

import { Button, DropdownMenu, Modal } from "@golink/ui";
import { Archive, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { deleteLinkAction, setLinkStateAction } from "@/app/actions";

export function LinkDetailMenu({ linkId, state }: { linkId: string; state: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const [error, setError] = React.useState<string | null>(null);

  /**
   * Run an action and say what happened.
   *
   * A failed action used to close the dialog and look like it had worked:
   * the link was still there and nothing said why. The message is the
   * difference between "it did not work" and "it is broken".
   */
  async function run(action: () => Promise<{ ok: boolean; error?: string } | undefined>) {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (result && !result.ok) {
      setError(result.error ?? "That could not be done.");
      return false;
    }
    router.refresh();
    return true;
  }

  return (
    <>
      <DropdownMenu
        label="More actions for this link"
        items={[
          {
            label: "Archive link",
            icon: <Archive aria-hidden="true" className="size-4" />,
            disabled: state === "Archived",
            onSelect: () => run(async () => setLinkStateAction(linkId, "archive")),
          },
          {
            label: "Delete link",
            destructive: true,
            icon: <Trash2 aria-hidden="true" className="size-4" />,
            onSelect: () => setConfirming(true),
          },
        ]}
      />
      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
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
              onClick={async () => {
                const done = await run(() => deleteLinkAction(linkId));
                if (!done) return;
                setConfirming(false);
                router.push("/links");
              }}
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
