import { getCtx, listDomains } from "@steadlink/data";
import { Badge, Button, Card, EmptyState } from "@steadlink/ui";
import { Globe, Plus } from "lucide-react";

import { AddDomainDialog } from "@/components/domains/add-domain-dialog";
import { DomainRecords } from "@/components/domains/domain-records";

export const dynamic = "force-dynamic";

const STATE_TONE = {
  verified: "success",
  pending: "warning",
  failed: "danger",
  missing: "danger",
} as const;

export default async function DomainsPage() {
  const ctx = await getCtx();
  const domains = await listDomains(ctx);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Custom domains</h1>
          <p className="mt-1 text-sm text-muted">
            Point a domain you own at Steadlink and every short link on it carries your name.
          </p>
        </div>
        <AddDomainDialog
          trigger={
            <Button>
              <Plus aria-hidden="true" className="size-4" />
              Add a domain
            </Button>
          }
        />
      </div>

      {domains.length <= 1 ? (
        <EmptyState
          icon={<Globe aria-hidden="true" />}
          title="No custom domains yet"
          body="Add a domain you already own. We will give you two DNS records to add at your provider, and links go live as soon as they resolve."
          action={<AddDomainDialog trigger={<Button>Add your first domain</Button>} />}
        />
      ) : null}

      <div className="space-y-4">
        {domains.map((domain) => (
          <Card key={domain.id} className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-mono text-lg font-semibold text-foreground">{domain.host}</h2>
                <p className="mt-1 text-sm text-muted">
                  {domain.kind === "default"
                    ? "The shared short domain. Every new link goes here unless you pick another one."
                    : "Your domain. Links on it use this address."}
                </p>
              </div>
              <Badge tone={STATE_TONE[domain.verificationStatus]}>
                {domain.verificationStatus === "verified" ? "Verified" : "Waiting for DNS"}
              </Badge>
            </div>

            {domain.kind !== "default" ? (
              <div className="mt-4">
                <DomainRecords
                  domainId={domain.id}
                  records={domain.dnsRecords}
                  status={domain.verificationStatus}
                />
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
