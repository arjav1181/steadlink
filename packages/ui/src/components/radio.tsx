"use client";

import * as React from "react";

import { cn } from "../lib/cn";

/**
 * A radio group built on native <input type="radio">.
 *
 * Why native and not role="radio" on a button: a native radio group gives
 * arrow-key navigation, a single tab stop, and the correct accessibility
 * semantics for free. Radix's RadioGroup is fine too, but the hand-rolled
 * pickers here all want the same thing, so they share one primitive.
 *
 * The input is visually hidden but stays focusable and in the accessibility
 * tree; the label is the visible control and carries the focus ring via the
 * `peer` variant.
 */
export function RadioGroup({
  label,
  options,
  value,
  onValueChange,
  className,
  itemClassName,
  renderItem,
  name,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  itemClassName?: string;
  renderItem?: (option: { value: string; label: string }) => React.ReactNode;
  name?: string;
}) {
  const generated = React.useId();
  const groupName = name ?? generated;

  return (
    <fieldset className={cn("border-0 p-0", className)}>
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <label key={option.value} className="cursor-pointer">
            <input
              type="radio"
              name={groupName}
              value={option.value}
              checked={checked}
              onChange={() => onValueChange(option.value)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex items-center justify-center rounded-sm border border-border bg-surface",
                "transition-colors duration-100",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
                "peer-checked:border-2 peer-checked:border-accent peer-checked:bg-accent-soft",
                itemClassName,
              )}
            >
              {renderItem ? renderItem(option) : option.label}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
