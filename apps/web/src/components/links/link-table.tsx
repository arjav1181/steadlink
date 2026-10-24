"use client";

import { Badge, Button, Checkbox, DropdownMenu, Tag as TagChip } from "@steadlink/ui";
import { Archive, EyeOff, Tag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { bulkUpdateLinksAction, deleteLinkAction, setLinkStateAction } from "@/app/actions";
import { formatDate, formatNumber } from "@/lib/format";

export interface LinkRow {
  id: string;
  code: string;
  title: string | null;
  longUrl: string;
  domainHost: string;
  tags: string[];
  createdAt: string;
  clickCount: number;
  scanCount: number;
  engagementCount: number;
  state: "Active" | "Hidden" | "Archived" | "Expired";
  hasQr: boolean;
}

const STATE_TONE = {
  Active: "success",
  Hidden: "neutral",
  Archived: "neutral",
  Expired: "warning",
} as const;

export function LinkTable({ rows }: { rows: LinkRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [tagValue, setTagValue] = React.useState("");

  const allSelected = rows.length > 0 && selected.length === rows.length;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    await action();
    setBusy(false);
    setSelected([]);
    router.refresh();
  }

  async function bulk(action: "archive" | "hide" | "unhide" | "tag") {
    await run(() =>
      bulkUpdateLinksAction(
        action,
        selected,
        action === "tag"
          ? tagValue
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
      ),
    );
    setTagValue("");
  }

  return (
    <div className="space-y-4">
      {selected.length > 0 ? (
        <section
          aria-label="Bulk actions"
          className="flex flex-wrap items-center gap-3 rounded-lg bg-accent px-4 py-3 shadow-pop"
        >
          <p className="text-sm font-semibold text-accent-foreground">
            {selected.length} {selected.length === 1 ? "link" : "links"} selected
          </p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label htmlFor="bulk-tag" className="sr-only">
              Tags to add
            </label>
            <input
              id="bulk-tag"
              value={tagValue}
              onChange={(event) => setTagValue(event.target.value)}
              placeholder="tag, tag"
              className="h-8 w-40 rounded-sm border border-transparent bg-surface-2 px-2 text-sm text-foreground placeholder:text-subtle focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || !tagValue.trim()}
              onClick={() => bulk("tag")}
              icon={<Tag aria-hidden="true" className="size-4" />}
            >
              Tag
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => bulk("hide")}
              icon={<EyeOff aria-hidden="true" className="size-4" />}
            >
              Hide
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => bulk("archive")}
              icon={<Archive aria-hidden="true" className="size-4" />}
            >
              Archive
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
              Clear
            </Button>
          </div>
        </section>
      ) : null}

      <div className="overflow-x-auto rounded-lg bg-surface shadow-card">
        <table className="w-full table-fixed border-collapse text-left text-sm md:table-auto">
          <caption className="sr-only">Your short links</caption>
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th scope="col" className="w-10 px-4 py-2.5">
                <Checkbox
                  hideLabel
                  label="Select every link on this page"
                  checked={allSelected}
                  indeterminate={selected.length > 0 && !allSelected}
                  onChange={(event) =>
                    setSelected(event.target.checked ? rows.map((row) => row.id) : [])
                  }
                />
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 text-xs font-semibold tracking-wide text-muted uppercase"
              >
                Title
              </th>
              <th
                scope="col"
                className="w-[34%] px-3 py-2.5 text-xs font-semibold tracking-wide text-muted uppercase md:w-auto"
              >
                Short link
              </th>
              <th
                scope="col"
                className="hidden px-3 py-2.5 text-xs font-semibold tracking-wide text-muted uppercase sm:table-cell"
              >
                Status
              </th>
              <th
                scope="col"
                className="hidden px-3 py-2.5 text-right text-xs font-semibold tracking-wide text-muted uppercase md:table-cell"
              >
                Engagement
              </th>
              <th
                scope="col"
                className="hidden px-3 py-2.5 text-xs font-semibold tracking-wide text-muted uppercase lg:table-cell"
              >
                Created
              </th>
              <th scope="col" className="w-12 px-3 py-2.5">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-surface-2">
                <td className="px-4 py-3">
                  <Checkbox
                    hideLabel
                    label={`Select ${row.title ?? row.code}`}
                    checked={selected.includes(row.id)}
                    onChange={() => toggle(row.id)}
                  />
                </td>
                <td className="px-3 py-3">
                  <Link
                    href={`/links/${row.id}`}
                    className="block max-w-[26ch] truncate font-medium text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {row.title ?? row.code}
                  </Link>
                  {row.tags.length ? (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {row.tags.map((tag) => (
                        <TagChip key={tag}>{tag}</TagChip>
                      ))}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  <Link
                    href={`/links/${row.id}`}
                    className="block max-w-full truncate font-mono text-xs text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {row.domainHost}/{row.code}
                  </Link>
                  {row.hasQr ? (
                    <span className="mt-1 block text-xs text-subtle">Has a QR code</span>
                  ) : null}
                </td>
                <td className="hidden px-3 py-3 sm:table-cell">
                  <Badge tone={STATE_TONE[row.state]}>{row.state}</Badge>
                </td>
                <td className="hidden px-3 py-3 text-right tabular-nums text-foreground md:table-cell">
                  {formatNumber(row.engagementCount)}
                </td>
                <td className="hidden px-3 py-3 whitespace-nowrap text-muted lg:table-cell">
                  {formatDate(row.createdAt)}
                </td>
                <td className="px-3 py-3">
                  <DropdownMenu
                    label={`Actions for ${row.title ?? row.code}`}
                    items={[
                      { label: "Open", onSelect: () => router.push(`/links/${row.id}`) },
                      {
                        label: row.state === "Hidden" ? "Show link" : "Hide link",
                        onSelect: () =>
                          run(() =>
                            setLinkStateAction(row.id, row.state === "Hidden" ? "show" : "hide"),
                          ),
                      },
                      {
                        label: "Archive link",
                        onSelect: () => run(() => setLinkStateAction(row.id, "archive")),
                      },
                      {
                        label: "Delete link",
                        destructive: true,
                        onSelect: () => run(() => deleteLinkAction(row.id)),
                      },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center text-sm text-muted">
          No links match. Try clearing a filter.
        </p>
      ) : null}
    </div>
  );
}
