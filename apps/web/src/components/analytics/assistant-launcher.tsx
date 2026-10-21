"use client";

import { Button } from "@golink/ui";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { AssistantPanel } from "@/components/app-shell";

const SUGGESTIONS = [
  "Summarise my performance from the last 7 days",
  "Compare my top performing links",
  "Which traffic sources drive the most clicks?",
  "What changed since last month?",
];

/**
 * Opens the assistant panel from the URL (?assistant=1) and from the button.
 */
export function AssistantLauncher() {
  const params = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (params.get("assistant") === "1") {
      setOpen(true);
      const next = new URLSearchParams(params.toString());
      next.delete("assistant");
      router.replace(`?${next.toString()}`, { scroll: false });
    }
  }, [params, router]);

  return (
    <>
      <Button variant="ai" onClick={() => setOpen(true)}>
        Ask about your data
      </Button>
      <AssistantPanel open={open} onClose={() => setOpen(false)} suggestions={SUGGESTIONS} />
    </>
  );
}
