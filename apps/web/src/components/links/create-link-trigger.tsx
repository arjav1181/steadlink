"use client";

import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { CreateLinkDialog } from "@/components/create-link-form";

export interface DomainOptionLite {
  id: string;
  host: string;
  verificationStatus: string;
  isDefault: boolean;
}

/**
 * Opens the create-link dialog when the URL asks for it (?new=1), and
 * removes the parameter afterwards so a refresh does not reopen it.
 */
export function CreateLinkTrigger({ domains }: { domains: DomainOptionLite[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (params.get("new") === "1") {
      setOpen(true);
      const next = new URLSearchParams(params.toString());
      next.delete("new");
      router.replace(`?${next.toString()}`, { scroll: false });
    }
  }, [params, router]);

  return (
    <CreateLinkDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) router.refresh();
      }}
      domains={domains}
    />
  );
}
