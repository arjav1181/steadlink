"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { ArrowDownRight, ArrowUpRight, CircleAlert, Info, Lock, TriangleAlert } from "lucide-react";
import type * as React from "react";

import { cn } from "../lib/cn";
import { Button } from "./button";

/* -------------------------------------------------------------------------- */
/*  Card                                                                      */
/* -------------------------------------------------------------------------- */

export function Card({
  title,
  description,
  action,
  interactive,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg bg-surface shadow-card",
        interactive &&
          "cursor-pointer transition-shadow duration-100 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
      {...props}
    >
      {title || action ? (
        <div className="flex items-start justify-between gap-4 p-5 pb-0">
          <div className="min-w-0">
            {title ? <h3 className="text-lg font-semibold text-foreground">{title}</h3> : null}
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stat card                                                                 */
/* -------------------------------------------------------------------------- */

export function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  delta?: number;
  deltaLabel?: string;
  /**
   * The icon is an element, not a component.
   *
   * A component cannot be handed from a server component to a client one:
   * a function is not something the boundary can carry, and the error it
   * produces says nothing about what to do. An element can.
   */
  icon?: React.ReactNode;
  className?: string;
}) {
  const up = (delta ?? 0) >= 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <div className={cn("rounded-lg bg-surface p-5 shadow-card", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon ? <span className="text-muted [&>svg]:size-4">{icon}</span> : null}
      </div>
      <p className="mt-2 text-3xl font-bold leading-none tracking-tight text-foreground">{value}</p>
      {delta !== undefined ? (
        <p
          className={cn(
            "mt-2 flex items-center gap-1 text-sm",
            up ? "text-success" : "text-danger",
          )}
        >
          <Arrow aria-hidden="true" className="size-4" />
          <span className="font-semibold">
            {up ? "+" : ""}
            {delta}%
          </span>
          {deltaLabel ? <span className="text-muted">{deltaLabel}</span> : null}
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Table                                                                     */
/* -------------------------------------------------------------------------- */

export function DataTable({
  caption,
  headers,
  children,
  className,
}: {
  caption: string;
  headers: { label: string; className?: string; sortable?: boolean }[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto rounded-lg bg-surface shadow-card", className)}>
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border bg-surface-2">
            {headers.map((header) => (
              <th
                key={header.label}
                scope="col"
                className={cn(
                  "px-4 py-2.5 text-xs font-semibold tracking-wide text-muted uppercase",
                  header.className,
                )}
              >
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tag / chip / badge                                                        */
/* -------------------------------------------------------------------------- */

export function Tag({
  children,
  onRemove,
  className,
}: {
  children: React.ReactNode;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border border-border bg-surface-2 px-2 py-0.5 text-xs font-medium text-foreground",
        className,
      )}
    >
      {children}
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove ${String(children)}`}
          onClick={onRemove}
          className="rounded-xs text-muted hover:text-foreground"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 12 12"
            className="size-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="m3 3 6 6M9 3l-6 6" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </span>
  );
}

export function Chip({
  children,
  onClick,
  selected,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}) {
  const cls = cn(
    "inline-flex h-7 items-center gap-1.5 rounded-pill px-3 text-sm font-medium transition-colors duration-100",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    selected
      ? "bg-accent-soft text-accent"
      : "bg-surface-2 text-muted hover:bg-surface-3 hover:text-foreground",
    onClick && "cursor-pointer",
    className,
  );
  if (!onClick) return <span className={cls}>{children}</span>;
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "ai";
  className?: string;
}) {
  const tones = {
    neutral: "bg-surface-2 text-muted",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    ai: "bg-ai-soft text-ai",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-sm px-1.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Empty state                                                               */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  icon,
  title,
  body,
  action,
  tone = "neutral",
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  tone?: "neutral" | "error";
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? <span className="text-muted [&>svg]:size-8">{icon}</span> : null}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {body ? <p className="max-w-[42ch] text-sm text-muted">{body}</p> : null}
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Quota chip and usage bar                                                  */
/* -------------------------------------------------------------------------- */

export function QuotaChip({
  remaining,
  total,
  className,
}: {
  remaining: number;
  total: number;
  className?: string;
}) {
  const exhausted = remaining <= 0;
  const near = !exhausted && remaining / Math.max(total, 1) <= 0.1;
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-pill px-2 text-xs font-semibold",
        exhausted
          ? "bg-danger-soft text-danger"
          : near
            ? "bg-warning-soft text-warning"
            : "bg-surface-2 text-muted",
        className,
      )}
    >
      {exhausted ? "Limit reached" : near ? `${remaining} left` : `${remaining} left`}
    </span>
  );
}

export function UsageBar({
  label,
  used,
  limit,
  className,
}: {
  label: string;
  used: number;
  limit: number;
  className?: string;
}) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const over = used > limit;
  const near = !over && pct >= 90;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className={cn("font-mono text-xs", over ? "text-danger" : "text-muted")}>
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuetext={`${used.toLocaleString()} of ${limit.toLocaleString()} ${label} used`}
        className="h-2 w-full overflow-hidden rounded-pill bg-surface-3"
      >
        <div
          className={cn(
            "h-full rounded-pill",
            over ? "bg-danger" : near ? "bg-warning" : "bg-accent",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Plan gate                                                                 */
/* -------------------------------------------------------------------------- */

export function PlanGate({
  reason,
  className,
  action,
}: {
  reason: string;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md border border-dashed border-border bg-surface-2 p-4",
        className,
      )}
    >
      <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{reason}</p>
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tooltip                                                                   */
/* -------------------------------------------------------------------------- */

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={200} skipDelayDuration={300}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-50 max-w-[280px] rounded-sm bg-accent px-2.5 py-1.5 text-xs text-accent-foreground shadow-pop"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/*  Toast                                                                     */
/* -------------------------------------------------------------------------- */

export type ToastTone = "success" | "error" | "info";

export function Toast({
  tone = "info",
  title,
  description,
  onDismiss,
  className,
}: {
  tone?: ToastTone;
  title: string;
  description?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  const Icon = tone === "success" ? CircleAlert : tone === "error" ? TriangleAlert : Info;
  const toneCls = {
    success: "border-success/40 text-success",
    error: "border-danger/40 text-danger",
    info: "border-border text-muted",
  } as const;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={cn(
        "flex w-[320px] items-start gap-3 rounded-md border bg-surface p-3.5 shadow-pop",
        toneCls[tone],
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="rounded-sm p-1 text-muted hover:text-foreground"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 12 12"
            className="size-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="m3 3 6 6M9 3l-6 6" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Skeleton                                                                  */
/* -------------------------------------------------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("animate-pulse rounded-sm bg-surface-2", className)} />
  );
}

export function SkeletonRegion({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Misc                                                                      */
/* -------------------------------------------------------------------------- */

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export { Button };
