"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal, X } from "lucide-react";
import type * as React from "react";

import { cn } from "../lib/cn";

/* -------------------------------------------------------------------------- */
/*  Modal                                                                     */
/* -------------------------------------------------------------------------- */

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = "md",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  width?: "sm" | "md" | "lg";
}) {
  const widths = { sm: "max-w-[420px]", md: "max-w-[480px]", lg: "max-w-[560px]" } as const;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(16,24,40,.45)] data-[state=open]:animate-in" />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2",
            "rounded-xl bg-surface shadow-pop focus:outline-none",
            widths[width],
          )}
        >
          <div className="flex items-start justify-between gap-4 p-6 pb-0">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-lg font-semibold text-foreground">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1 text-sm text-muted">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              aria-label="Close"
              className="-m-1 rounded-sm p-1 text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent"
            >
              <X aria-hidden="true" className="size-4" />
            </DialogPrimitive.Close>
          </div>
          {children ? <div className="p-6">{children}</div> : null}
          {footer ? (
            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              {footer}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/*  Drawer                                                                    */
/* -------------------------------------------------------------------------- */

export function Drawer({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-[rgba(16,24,40,.25)]" />
        <DialogPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex w-[380px] max-w-[90vw] flex-col border-l border-border bg-surface shadow-pop focus:outline-none">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <DialogPrimitive.Title className="text-base font-semibold text-foreground">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close"
              className="rounded-sm p-1 text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent"
            >
              <X aria-hidden="true" className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto p-5">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/*  Dropdown menu                                                             */
/* -------------------------------------------------------------------------- */

export interface MenuItem {
  label: string;
  onSelect?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function DropdownMenu({
  items,
  label = "More actions",
  align = "end",
}: {
  items: MenuItem[];
  label?: string;
  align?: "start" | "center" | "end";
}) {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger
        aria-label={label}
        className="flex size-7 items-center justify-center rounded-sm text-muted transition-colors duration-100 hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <MoreHorizontal aria-hidden="true" className="size-4" />
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align={align}
          sideOffset={4}
          className="z-50 min-w-[200px] rounded-md border border-border bg-surface p-1 shadow-pop"
        >
          {items.map((item) => (
            <DropdownMenuPrimitive.Item
              key={item.label}
              disabled={item.disabled}
              onSelect={item.onSelect}
              data-destructive={item.destructive ? "" : undefined}
              className={cn(
                "flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none",
                "data-[highlighted]:bg-surface-2 data-[disabled]:pointer-events-none data-[disabled]:text-subtle",
                item.destructive
                  ? "text-danger data-[highlighted]:bg-danger-soft"
                  : "text-foreground",
              )}
            >
              {item.icon}
              {item.label}
            </DropdownMenuPrimitive.Item>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stepper                                                                   */
/* -------------------------------------------------------------------------- */

export function Stepper({
  steps,
  current,
  className,
}: {
  steps: string[];
  current: number;
  className?: string;
}) {
  return (
    <ol className={cn("flex items-center gap-2", className)}>
      {steps.map((step, index) => {
        const state = index < current ? "complete" : index === current ? "current" : "upcoming";
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              aria-current={state === "current" ? "step" : undefined}
              className={cn(
                "flex size-7 items-center justify-center rounded-pill text-xs font-semibold",
                state === "complete" && "bg-accent text-accent-foreground",
                state === "current" && "border-2 border-accent text-accent",
                state === "upcoming" && "border border-border text-subtle",
              )}
            >
              {state === "complete" ? (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 14 14"
                  className="size-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m3 7.5 2.5 2.5L11 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                index + 1
              )}
              <span className="sr-only">
                {state === "complete"
                  ? " (complete)"
                  : state === "current"
                    ? " (current step)"
                    : ""}
              </span>
            </span>
            <span
              className={cn(
                "text-sm",
                state === "current" ? "font-semibold text-foreground" : "text-muted",
              )}
            >
              {step}
            </span>
            {index < steps.length - 1 ? (
              <span aria-hidden="true" className="h-px w-8 bg-border" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/* -------------------------------------------------------------------------- */
/*  Bulk action bar                                                           */
/* -------------------------------------------------------------------------- */

export function BulkActionBar({
  count,
  noun = "items",
  children,
}: {
  count: number;
  noun?: string;
  children?: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section
      aria-label="Bulk actions"
      className="flex items-center gap-3 rounded-lg bg-accent px-4 py-3 shadow-pop"
    >
      <p className="text-sm font-semibold text-accent-foreground">
        {count} {noun} selected
      </p>
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </section>
  );
}
