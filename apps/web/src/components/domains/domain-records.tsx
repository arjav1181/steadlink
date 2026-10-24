"use client";

import { Button, CopyButton } from "@steadlink/ui";
import { useRouter } from "next/navigation";
import * as React from "react";

import { verifyDomainAction } from "@/app/domain-actions";

export function DomainRecords({
  domainId,
  records,
  status,
}: {
  domainId: string;
  records: { type: string; name: string; value: string }[];
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);
  const [checks, setChecks] = React.useState<
    { type: string; name: string; expected: string; found: string | null; ok: boolean }[] | null
  >(null);

  async function check() {
    setBusy(true);
    setResult(null);
    const answer = await verifyDomainAction(domainId);
    setBusy(false);
    setChecks(answer.check ?? null);
    setResult(
      answer.verified
        ? "The records are resolving. This domain is live."
        : answer.check && answer.check.length > 0
          ? "Some records are not there yet. DNS can take a while to propagate."
          : "Nothing was found for that domain yet.",
    );
    router.refresh();
  }

  return (
    <div>
      <p className="text-sm font-semibold text-foreground">Add these at your DNS provider</p>
      <div className="mt-2 overflow-hidden rounded-md border border-border">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">DNS records to add</caption>
          <thead>
            <tr className="border-b border-border bg-surface-2">
              {["Type", "Name", "Value", "Status", ""].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="px-3 py-2 text-xs font-semibold text-muted uppercase"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {records.map((record) => {
              const check = checks?.find(
                (entry) => entry.type === record.type && entry.name.endsWith(record.name),
              );
              return (
                <tr key={`${record.type}-${record.name}`}>
                  <td className="px-3 py-2.5 font-mono text-xs">{record.type}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{record.name}</td>
                  <td className="px-3 py-2.5 font-mono text-xs break-all text-muted">
                    {record.value}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {check ? (
                      check.ok ? (
                        <span className="font-medium text-success">Found</span>
                      ) : (
                        <span className="text-muted">
                          {check.found ? `Found ${check.found}` : "Not found"}
                        </span>
                      )
                    ) : (
                      <span className="text-muted">Not checked</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5">
                    <CopyButton value={record.value} label={`Copy the ${record.type} record`} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={check} loading={busy}>
          Check the records now
        </Button>
        <p className="text-sm text-muted" role="status">
          {result ??
            (status === "verified"
              ? "These records are resolving."
              : "Waiting for DNS to propagate.")}
        </p>
      </div>
    </div>
  );
}
