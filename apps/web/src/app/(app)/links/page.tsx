import {
  decodeCursor,
  getCtx,
  getUsers,
  listCampaigns,
  listDomains,
  listLinks,
} from "@steadlink/data";
import { Badge, Button, Card, EmptyState } from "@steadlink/ui";
import { ChevronLeft, ChevronRight, Filter, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { CreateLinkTrigger } from "@/components/links/create-link-trigger";
import { LinkFilterSelect } from "@/components/links/link-filters";
import { type LinkRow, LinkTable } from "@/components/links/link-table";
import { SearchForm } from "@/components/search-form";

import { linkStateLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

/** How many links one page holds. */
const PAGE_SIZE = 50;

const STATES = [
  { value: "active", label: "Active" },
  { value: "hidden", label: "Hidden" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
] as const;

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "clicks", label: "Most engagement" },
  { value: "title", label: "By title" },
] as const;

const EXPIRIES = [
  { value: "expired", label: "Already expired" },
  { value: "expiring", label: "Expiring this week" },
  { value: "none", label: "No expiry" },
] as const;

const YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

export default async function LinksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getCtx();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const state = typeof params.state === "string" ? params.state : "active";
  const sort = typeof params.sort === "string" ? params.sort : "newest";
  const tag = typeof params.tag === "string" ? params.tag : undefined;
  const campaign = typeof params.campaign === "string" ? params.campaign : "";
  const creator = typeof params.by === "string" ? params.by : "";
  const qr = typeof params.qr === "string" ? params.qr : "";
  const routing = typeof params.routing === "string" ? params.routing : "";
  const deeplink = typeof params.deeplink === "string" ? params.deeplink : "";
  const expiry = typeof params.expiry === "string" ? params.expiry : "";
  const offset = decodeCursor(typeof params.cursor === "string" ? params.cursor : null);

  const [{ links, total, nextCursor }, domains, campaigns, members] = await Promise.all([
    listLinks(ctx, {
      query: query || undefined,
      state: state as "active" | "hidden" | "archived" | "all",
      sort: sort as "newest" | "oldest" | "clicks" | "title",
      tags: tag ? [tag] : undefined,
      campaignId: campaign || undefined,
      createdBy: creator || undefined,
      hasQr: qr === "" ? undefined : qr === "yes",
      hasRouting: routing === "" ? undefined : routing === "yes",
      hasDeeplink: deeplink === "" ? undefined : deeplink === "yes",
      expired: expiry === "" ? undefined : (expiry as "expired" | "expiring" | "none"),
      groupId: ctx.groupId,
      limit: PAGE_SIZE,
      offset,
    }),
    listDomains(ctx),
    listCampaigns(ctx),
    getUsers(ctx),
  ]);

  const rows: LinkRow[] = links.map((link) => ({
    id: link.id,
    code: link.code,
    title: link.title,
    longUrl: link.longUrl,
    domainHost: link.domain.host,
    tags: link.tags,
    createdAt: link.createdAt,
    clickCount: link.clickCountTotal,
    scanCount: link.scanCount,
    engagementCount: link.engagementCount,
    state: linkStateLabel(link),
    hasQr: Boolean(link.qrCode),
  }));

  const baseParams = new URLSearchParams();
  if (query) baseParams.set("q", query);
  if (state !== "active") baseParams.set("state", state);
  if (sort !== "newest") baseParams.set("sort", sort);
  if (tag) baseParams.set("tag", tag);
  if (campaign) baseParams.set("campaign", campaign);
  if (creator) baseParams.set("by", creator);
  if (qr) baseParams.set("qr", qr);
  if (routing) baseParams.set("routing", routing);
  if (deeplink) baseParams.set("deeplink", deeplink);
  if (expiry) baseParams.set("expiry", expiry);

  // The same parameters, minus the tag filter.
  const withoutTag = new URLSearchParams(baseParams);
  withoutTag.delete("tag");

  // A filter that is set is a question the list is answering, so it is
  // shown as a chip with a way to take it away.
  const activeFilters = [
    tag ? { key: "tag", label: "Tagged", value: tag } : null,
    campaign
      ? {
          key: "campaign",
          label: "Campaign",
          value: campaigns.find((entry) => entry.id === campaign)?.name ?? campaign,
        }
      : null,
    creator
      ? {
          key: "by",
          label: "Made by",
          value: members.find((member) => member.userId === creator)?.user.name ?? creator,
        }
      : null,
    qr ? { key: "qr", label: "QR code", value: qr === "yes" ? "has one" : "has none" } : null,
    routing
      ? { key: "routing", label: "Routing", value: routing === "yes" ? "has rules" : "has none" }
      : null,
    deeplink
      ? {
          key: "deeplink",
          label: "App link",
          value: deeplink === "yes" ? "has an app link" : "has none",
        }
      : null,
    expiry
      ? {
          key: "expiry",
          label: "Expiry",
          value: EXPIRIES.find((entry) => entry.value === expiry)?.label ?? expiry,
        }
      : null,
  ].filter((entry): entry is { key: string; label: string; value: string } => entry !== null);

  const filtered = activeFilters.length > 0 || query !== "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Links</h1>
          <p className="mt-1 text-sm text-muted">
            {total} {total === 1 ? "link" : "links"}
            {query ? ` matching “${query}”` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" asChild>
            <Link href="/qr">QR codes</Link>
          </Button>
          <Button asChild>
            <Link href="/links?new=1">
              <Plus aria-hidden="true" className="size-4" />
              New link
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchForm
            className="min-w-[220px] flex-1"
            label="Search links"
            value={query}
            placeholder="Search by title, code, destination or tag"
          />

          <fieldset className="flex items-center gap-1">
            <legend className="sr-only">Filter by state</legend>
            {STATES.map((option) => {
              const params = new URLSearchParams(baseParams);
              if (option.value === "active") params.delete("state");
              else params.set("state", option.value);
              const active = state === option.value;
              return (
                <Link
                  key={option.value}
                  href={`/links?${params.toString()}`}
                  aria-current={active ? "true" : undefined}
                  className={[
                    "inline-flex h-8 items-center rounded-sm px-3 text-sm font-medium transition-colors duration-100",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    active
                      ? "bg-accent-soft text-accent"
                      : "text-muted hover:bg-surface-3 hover:text-foreground",
                  ].join(" ")}
                >
                  {option.label}
                </Link>
              );
            })}
          </fieldset>

          <Suspense fallback={null}>
            <LinkFilterSelect
              name="campaign"
              label="Campaign"
              value={campaign}
              anyLabel="Any campaign"
              options={campaigns.map((entry) => ({ value: entry.id, label: entry.name }))}
            />
            <LinkFilterSelect
              name="by"
              label="Made by"
              value={creator}
              anyLabel="Anyone"
              options={members.map((member) => ({
                value: member.userId,
                label: member.user.name,
              }))}
            />
            <LinkFilterSelect
              name="qr"
              label="Has a QR code"
              value={qr}
              anyLabel="Any"
              options={YES_NO.map((option) => ({ value: option.value, label: option.label }))}
            />
            <LinkFilterSelect
              name="routing"
              label="Routing"
              value={routing}
              anyLabel="Any"
              options={YES_NO.map((option) => ({ value: option.value, label: option.label }))}
            />
            <LinkFilterSelect
              name="deeplink"
              label="App link"
              value={deeplink}
              anyLabel="Any"
              options={YES_NO.map((option) => ({ value: option.value, label: option.label }))}
            />
            <LinkFilterSelect
              name="expiry"
              label="Expiry"
              value={expiry}
              anyLabel="Any"
              options={EXPIRIES.map((option) => ({ value: option.value, label: option.label }))}
            />
            <LinkFilterSelect
              name="sort"
              label="Sort"
              value={sort === "newest" ? "" : sort}
              anyLabel="Newest first"
              options={SORTS.filter((option) => option.value !== "newest").map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
          </Suspense>
        </div>

        {activeFilters.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Filter aria-hidden="true" className="size-3.5 text-muted" />
            {activeFilters.map((entry) => {
              const params = new URLSearchParams(baseParams);
              params.delete(entry.key);
              return (
                <span key={entry.key} className="flex items-center gap-1">
                  <span className="text-sm text-muted">{entry.label}</span>
                  <Badge tone="neutral">{entry.value}</Badge>
                  <Link
                    href={`/links?${params.toString()}`}
                    className="text-sm font-semibold text-accent hover:underline"
                  >
                    Clear
                  </Link>
                </span>
              );
            })}
          </div>
        ) : null}
      </Card>

      {/* Table */}
      {rows.length === 0 ? (
        <EmptyState
          icon={<Plus aria-hidden="true" />}
          title={
            filtered
              ? "No links match those filters"
              : ctx.groupId
                ? "This group has no links yet"
                : "Your workspace has no links yet"
          }
          body={
            filtered
              ? "Try a shorter term, or clear a filter to see more."
              : "Each group keeps its own links. Make one here and it stays in this group."
          }
          action={
            filtered ? (
              <Button variant="secondary" asChild>
                <Link href="/links">Clear the filters</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/links?new=1">Make a link</Link>
              </Button>
            )
          }
        />
      ) : (
        <Suspense fallback={null}>
          <LinkTable rows={rows} />
        </Suspense>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE ? (
        <nav aria-label="Link pages" className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted">
            Showing {offset + 1} to {Math.min(offset + links.length, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            {offset > 0 ? (
              <Button variant="secondary" asChild>
                <Link
                  href={`/links?${new URLSearchParams({
                    ...Object.fromEntries(baseParams),
                    cursor: Buffer.from(String(Math.max(0, offset - PAGE_SIZE)), "utf8").toString(
                      "base64url",
                    ),
                  }).toString()}`}
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                  Previous
                </Link>
              </Button>
            ) : null}
            {nextCursor ? (
              <Button variant="secondary" asChild>
                <Link
                  href={`/links?${new URLSearchParams({
                    ...Object.fromEntries(baseParams),
                    cursor: nextCursor,
                  }).toString()}`}
                >
                  Next
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
            ) : null}
          </div>
        </nav>
      ) : null}

      <CreateLinkTrigger
        domains={domains.map((domain) => ({
          id: domain.id,
          host: domain.host,
          verificationStatus: domain.verificationStatus,
          isDefault: domain.kind === "default",
        }))}
      />
    </div>
  );
}
