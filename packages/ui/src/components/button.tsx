"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2, Sparkles } from "lucide-react";
import * as React from "react";

import { cn } from "../lib/cn";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-semibold transition-colors duration-100 ease-standard",
    "disabled:pointer-events-none disabled:opacity-50",
    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
    "[&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-foreground hover:bg-accent-hover active:bg-accent-active",
        secondary:
          "border border-input bg-surface text-foreground hover:bg-surface-2 active:bg-surface-3",
        ghost: "bg-transparent text-accent hover:bg-accent-soft",
        danger: "bg-danger text-accent-foreground hover:brightness-95",
        link: "h-auto bg-transparent p-0 text-accent underline underline-offset-4 hover:no-underline",
        ai: "border border-ai/30 bg-ai-soft text-ai hover:bg-ai/15",
      },
      size: {
        sm: "h-8 rounded-md px-3 text-sm",
        md: "h-10 rounded-md px-4 text-sm",
        lg: "h-12 rounded-lg px-5 text-base",
        icon: "h-10 w-10 rounded-md p-0",
        "icon-sm": "h-8 w-8 rounded-md p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  /** Rendered before the label. Decorative unless it carries meaning. */
  icon?: React.ReactNode;
}

/**
 * A loading button keeps its accessible name: the label stays in the DOM and
 * the spinner is aria-hidden, so a screen reader hears the same name it
 * always did, plus a busy state.
 *
 * With `asChild`, the button becomes the child element you pass. Radix's
 * Slot requires exactly one element child, so any icon and the loading
 * state have to live inside that element - the consumer's job, not ours.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading, icon, children, disabled, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    if (asChild) {
      return (
        <Comp
          ref={ref}
          className={cn(buttonVariants({ variant, size }), className)}
          aria-busy={loading || undefined}
          aria-disabled={disabled || loading || undefined}
          data-disabled={disabled || loading || undefined ? "" : undefined}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        type={props.type ?? "button"}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : variant === "ai" ? (
          <Sparkles aria-hidden="true" className="size-4" />
        ) : (
          icon
        )}
        {children}
        {loading ? <span className="sr-only"> (loading)</span> : null}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export interface IconButtonProps extends Omit<ButtonProps, "children" | "size"> {
  /** Required. An icon-only button has no visible text, so it needs a name. */
  label: string;
  size?: "icon" | "icon-sm";
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, label, size = "icon", icon, ...props }, ref) => (
    <Button
      ref={ref}
      size={size}
      variant="ghost"
      aria-label={label}
      className={cn("text-muted hover:text-foreground", className)}
      icon={icon}
      {...props}
    />
  ),
);
IconButton.displayName = "IconButton";

/**
 * Share a link.
 *
 * A phone has a share sheet, and it is the button people press there: it
 * puts the link into a message, a post or a wallet without a person
 * copying it first. A computer usually has no share sheet, so the
 * clipboard takes its place and the button says what it did.
 */
export function ShareButton({
  value,
  title,
  label = "Share",
  className,
}: {
  value: string;
  title?: string;
  label?: string;
  className?: string;
}) {
  const [state, setState] = React.useState<"idle" | "shared" | "copied" | "error">("idle");

  async function share() {
    const api = navigator as Navigator & {
      share?: (data: { title?: string; url?: string }) => Promise<void>;
    };

    if (typeof api.share === "function") {
      try {
        await api.share({ title: title ?? value, url: value });
        setState("shared");
        window.setTimeout(() => setState("idle"), 2000);
        return;
      } catch (failure) {
        // Closing the sheet is not a failure: the person changed their
        // mind. Only a real error falls through to the clipboard.
        if ((failure as Error)?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("error");
    }
    window.setTimeout(() => setState("idle"), 2000);
  }

  const name =
    state === "shared"
      ? "Shared"
      : state === "copied"
        ? "Copied"
        : state === "error"
          ? "Share failed"
          : label;

  return (
    <IconButton
      size="icon-sm"
      label={name}
      aria-live="polite"
      onClick={() => void share()}
      className={cn(
        (state === "shared" || state === "copied") && "text-success",
        state === "error" && "text-danger",
        className,
      )}
      icon={
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="3.5" r="2" />
          <circle cx="4" cy="8" r="2" />
          <circle cx="12" cy="12.5" r="2" />
          <path d="m5.8 7 4.4-2.4M5.8 9l4.4 2.4" strokeLinecap="round" />
        </svg>
      }
    />
  );
}

/**
 * Copy-to-clipboard. On success the accessible name changes to "Copied" for
 * two seconds, so the confirmation reaches a screen-reader user and not only
 * a sighted one.
 */
export function CopyButton({
  value,
  label = "Copy",
  className,
  onCopied,
}: {
  value: string;
  label?: string;
  className?: string;
  onCopied?: () => void;
}) {
  const [state, setState] = React.useState<"idle" | "copied" | "error">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
      onCopied?.();
      window.setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      window.setTimeout(() => setState("idle"), 2000);
    }
  }

  return (
    <IconButton
      size="icon-sm"
      label={state === "copied" ? "Copied" : state === "error" ? "Copy failed" : label}
      aria-live="polite"
      onClick={copy}
      className={cn(
        state === "copied" && "text-success",
        state === "error" && "text-danger",
        className,
      )}
      icon={
        state === "copied" ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m3 8.5 3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
            <path d="M10.5 3.5h-7a1 1 0 0 0-1 1v7" strokeLinecap="round" />
          </svg>
        )
      }
    />
  );
}
