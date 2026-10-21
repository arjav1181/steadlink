"use client";

import {
  BarChart3,
  FileText,
  Folder,
  Globe,
  Home,
  Link2,
  type LucideIcon,
  QrCode,
  Settings,
  Users,
} from "lucide-react";
import * as React from "react";

import { cn } from "../lib/cn";
import { Button } from "./button";
import { DropdownMenu } from "./overlays";

/* -------------------------------------------------------------------------- */
/*  Icon rail                                                                 */
/* -------------------------------------------------------------------------- */

export interface RailItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export function IconRail({
  items,
  current,
  onSelect,
  className,
}: {
  items: RailItem[];
  current: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        "flex w-rail flex-col items-center gap-1 border-r border-border bg-surface",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Create new"
        className="mt-4 flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M8 3v10M3 8h10" strokeLinecap="round" />
        </svg>
      </button>
      <div className="mt-3 flex flex-1 flex-col items-center gap-1">
        {items.map((item) => {
          const active = item.id === current;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex size-11 items-center justify-center rounded-md transition-colors duration-100",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                active
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              <Icon aria-hidden="true" className="size-5" />
              <span className="sr-only">{item.label}</span>
              {item.badge ? (
                <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-pill bg-danger px-1 text-[10px] font-semibold text-accent-foreground">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="mb-4 flex flex-col items-center gap-1">
        <button
          type="button"
          aria-label="Settings"
          className={cn(
            "flex size-11 items-center justify-center rounded-md transition-colors duration-100",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            current === "settings"
              ? "bg-accent-soft text-accent"
              : "text-muted hover:bg-surface-2 hover:text-foreground",
          )}
        >
          <Settings aria-hidden="true" className="size-5" />
        </button>
        <span className="flex size-8 items-center justify-center rounded-pill bg-accent-soft text-xs font-semibold text-accent">
          AR
          <span className="sr-only">Account menu for Arjav</span>
        </span>
      </div>
    </nav>
  );
}

export const DEFAULT_RAIL_ITEMS: RailItem[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "links", label: "Links", icon: Link2 },
  { id: "qr", label: "QR codes", icon: QrCode },
  { id: "pages", label: "Pages", icon: FileText },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "campaigns", label: "Campaigns", icon: Folder },
  { id: "channels", label: "Channels", icon: Globe },
  { id: "users", label: "Users", icon: Users },
];

/* -------------------------------------------------------------------------- */
/*  Chart action bar                                                          */
/* -------------------------------------------------------------------------- */

export function ChartActionBar({
  onCompare,
  onDownload,
  onMore,
}: {
  onCompare?: () => void;
  onDownload?: () => void;
  onMore?: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {onCompare ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={onCompare}
          icon={<span aria-hidden="true">+</span>}
        >
          Compare
        </Button>
      ) : null}
      {onDownload ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Download"
          onClick={onDownload}
          icon={
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                d="M8 2v8m0 0 3-3m-3 3L5 7M3 13h10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
      ) : null}
      {onMore ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="More"
          onClick={onMore}
          icon={
            <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="currentColor">
              <circle cx="3" cy="8" r="1.4" />
              <circle cx="8" cy="8" r="1.4" />
              <circle cx="13" cy="8" r="1.4" />
            </svg>
          }
        />
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Device frame                                                              */
/* -------------------------------------------------------------------------- */

export function DeviceFrame({
  device,
  children,
  className,
}: {
  device: "phone" | "tablet" | "desktop";
  children: React.ReactNode;
  className?: string;
}) {
  const widths = { phone: 375, tablet: 768, desktop: 1280 } as const;
  return (
    <div
      aria-hidden="true"
      className={cn("overflow-hidden rounded-xl border border-border bg-surface-3", className)}
      style={{ width: widths[device] }}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  DNS record table                                                          */
/* -------------------------------------------------------------------------- */

export type DnsState = "pending" | "verified" | "failed" | "missing";

export function DnsRecordTable({
  records,
  className,
}: {
  records: { type: string; name: string; value: string; state: DnsState }[];
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-md border border-border", className)}>
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">DNS records to add at your DNS provider</caption>
        <thead>
          <tr className="border-b border-border bg-surface-2">
            {["Type", "Name", "Value", "Status"].map((heading) => (
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
          {records.map((record) => (
            <tr key={`${record.type}-${record.name}`}>
              <td className="px-3 py-2.5 font-mono text-xs text-foreground">{record.type}</td>
              <td className="px-3 py-2.5 font-mono text-xs text-foreground">{record.name}</td>
              <td className="px-3 py-2.5 font-mono text-xs break-all text-muted">{record.value}</td>
              <td className="px-3 py-2.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-medium",
                    record.state === "verified" && "text-success",
                    record.state === "failed" && "text-danger",
                    record.state === "pending" && "text-muted",
                    record.state === "missing" && "text-warning",
                  )}
                >
                  <span aria-hidden="true" className="size-1.5 rounded-pill bg-current" />
                  {record.state}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Block list                                                                */
/* -------------------------------------------------------------------------- */

export interface BlockItem {
  id: string;
  type: string;
  title: string;
  detail?: string;
}

export function BlockList({
  blocks,
  onMove,
  onRemove,
  className,
}: {
  blocks: BlockItem[];
  onMove?: (id: string, direction: "up" | "down") => void;
  onRemove?: (id: string) => void;
  className?: string;
}) {
  const [dragId, setDragId] = React.useState<string | null>(null);
  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {blocks.map((block, index) => (
        <li
          key={block.id}
          draggable
          onDragStart={() => setDragId(block.id)}
          onDragEnd={() => setDragId(null)}
          className={cn(
            "flex items-center gap-3 rounded-md border bg-surface p-3 transition-shadow duration-100",
            dragId === block.id ? "opacity-90 shadow-pop" : "border-border",
          )}
        >
          <span aria-hidden="true" className="cursor-grab text-muted">
            <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="currentColor">
              <circle cx="6" cy="4" r="1.2" />
              <circle cx="10" cy="4" r="1.2" />
              <circle cx="6" cy="8" r="1.2" />
              <circle cx="10" cy="8" r="1.2" />
              <circle cx="6" cy="12" r="1.2" />
              <circle cx="10" cy="12" r="1.2" />
            </svg>
          </span>
          <span className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-muted">
            {block.type}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {block.title}
          </span>
          {block.detail ? (
            <span className="truncate text-xs text-muted">{block.detail}</span>
          ) : null}
          <span className="text-xs text-muted">
            {index + 1} of {blocks.length}
          </span>
          <DropdownMenu
            label={`Actions for ${block.title}`}
            items={[
              { label: "Move up", onSelect: () => onMove?.(block.id, "up"), disabled: index === 0 },
              {
                label: "Move down",
                onSelect: () => onMove?.(block.id, "down"),
                disabled: index === blocks.length - 1,
              },
              { label: "Delete", onSelect: () => onRemove?.(block.id), destructive: true },
            ]}
          />
        </li>
      ))}
    </ul>
  );
}
