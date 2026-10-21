"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as Switch from "@radix-ui/react-switch";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { Check, ChevronDown, Search, X } from "lucide-react";
import * as React from "react";

import { cn } from "../lib/cn";

/* -------------------------------------------------------------------------- */
/*  Field                                                                     */
/* -------------------------------------------------------------------------- */

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  counter,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  counter?: { value: number; max: number };
  className?: string;
  children: React.ReactNode;
}) {
  const hintId = htmlFor ? `${htmlFor}-hint` : undefined;
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  // A <label for> does NOT name a <button>. Radix's Select trigger and
  // Switch are buttons, so they need aria-labelledby pointing at this id.
  const labelId = htmlFor ? `${htmlFor}-label` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <LabelPrimitive.Root
          id={labelId}
          htmlFor={htmlFor}
          className="text-sm font-semibold text-foreground"
        >
          {label}
          {required ? (
            <>
              <span aria-hidden="true" className="ml-0.5 text-danger">
                *
              </span>
              <span className="sr-only"> (required)</span>
            </>
          ) : null}
        </LabelPrimitive.Root>
        {counter ? (
          <span
            className={cn(
              "font-mono text-xs",
              counter.value > counter.max ? "text-danger" : "text-muted",
            )}
            aria-live="polite"
          >
            {counter.value}/{counter.max}
          </span>
        ) : null}
      </div>
      {children}
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Text input                                                                */
/* -------------------------------------------------------------------------- */

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  leadingIcon?: React.ReactNode;
  trailing?: React.ReactNode;
  counter?: { value: number; max: number };
  mono?: boolean;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  (
    { label, hint, error, leadingIcon, trailing, counter, mono, className, id, required, ...props },
    ref,
  ) => {
    const reactId = React.useId();
    const inputId = id ?? reactId;
    const describedBy = [hint ? `${inputId}-hint` : null, error ? `${inputId}-error` : null]
      .filter(Boolean)
      .join(" ");

    const control = (
      <div className="relative flex items-center">
        {leadingIcon ? (
          <span aria-hidden="true" className="pointer-events-none absolute left-3 text-muted">
            {leadingIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            "h-10 w-full rounded-md border bg-surface px-3 text-base text-foreground",
            "placeholder:text-subtle transition-colors duration-100",
            "focus:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
            "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted",
            mono && "font-mono text-sm",
            leadingIcon && "pl-9",
            trailing && "pr-10",
            error ? "border-danger" : "border-input",
            className,
          )}
          {...props}
        />
        {trailing ? <span className="absolute right-2 flex items-center">{trailing}</span> : null}
      </div>
    );

    if (!label && !hint && !error && !counter) return control;

    return (
      <Field
        label={label ?? ""}
        htmlFor={inputId}
        hint={hint}
        error={error}
        required={required}
        counter={counter}
      >
        {control}
      </Field>
    );
  },
);
TextInput.displayName = "TextInput";

/* -------------------------------------------------------------------------- */
/*  Textarea                                                                  */
/* -------------------------------------------------------------------------- */

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  counter?: { value: number; max: number };
  ai?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, counter, ai, className, id, required, ...props }, ref) => {
    const reactId = React.useId();
    const inputId = id ?? reactId;
    const describedBy = [hint ? `${inputId}-hint` : null, error ? `${inputId}-error` : null]
      .filter(Boolean)
      .join(" ");

    const control = (
      <textarea
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          "min-h-24 w-full resize-y rounded-md border bg-surface p-3 text-base text-foreground",
          "placeholder:text-subtle transition-colors duration-100",
          "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
          "disabled:cursor-not-allowed disabled:bg-surface-2",
          ai
            ? "border-ai/40 focus-visible:outline-ai"
            : "border-input focus-visible:outline-accent",
          error && "border-danger",
          className,
        )}
        {...props}
      />
    );

    if (!label && !hint && !error && !counter) return control;
    return (
      <Field
        label={label ?? ""}
        htmlFor={inputId}
        hint={hint}
        error={error}
        required={required}
        counter={counter}
      >
        {control}
      </Field>
    );
  },
);
Textarea.displayName = "Textarea";

/* -------------------------------------------------------------------------- */
/*  Select                                                                    */
/* -------------------------------------------------------------------------- */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export function Select({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Select…",
  hint,
  error,
  className,
  id,
}: {
  label?: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const reactId = React.useId();
  const selectId = id ?? reactId;
  return (
    <Field label={label ?? ""} htmlFor={selectId} hint={hint} error={error}>
      <SelectPrimitive.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange}>
        <SelectPrimitive.Trigger
          id={selectId}
          aria-labelledby={`${selectId}-label`}
          aria-invalid={error ? true : undefined}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-surface px-3 text-base text-foreground",
            "transition-colors duration-100 focus:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
            "data-[placeholder]:text-subtle disabled:cursor-not-allowed disabled:bg-surface-2",
            error ? "border-danger" : "border-input",
            className,
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <ChevronDown aria-hidden="true" className="size-4 text-muted" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className={cn(
              "z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-surface shadow-pop",
            )}
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={cn(
                    "flex cursor-pointer select-none items-center justify-between gap-2 rounded-sm px-3 py-2 text-base text-foreground",
                    "outline-none data-[highlighted]:bg-surface-2 data-[state=checked]:bg-accent-soft",
                    "data-[disabled]:pointer-events-none data-[disabled]:text-subtle",
                  )}
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <Check aria-hidden="true" className="size-4 text-accent" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </Field>
  );
}

/* -------------------------------------------------------------------------- */
/*  Toggle                                                                    */
/* -------------------------------------------------------------------------- */

export function Toggle({
  label,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  className,
}: {
  label: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  const id = React.useId();
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Switch.Root
        id={id}
        aria-labelledby={`${id}-label`}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-pill border border-input bg-surface-3 transition-colors duration-100",
          "data-[state=checked]:border-accent data-[state=checked]:bg-accent",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <Switch.Thumb className="block size-4 translate-x-0.5 rounded-pill bg-surface shadow-card transition-transform duration-100 data-[state=checked]:translate-x-4" />
      </Switch.Root>
      <label id={`${id}-label`} htmlFor={id} className="text-sm text-foreground">
        {label}
      </label>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Checkbox                                                                  */
/* -------------------------------------------------------------------------- */

export function Checkbox({
  label,
  indeterminate,
  hideLabel = false,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: React.ReactNode;
  /** Drives the native indeterminate property, for a "select all" checkbox. */
  indeterminate?: boolean;
  /**
   * Visually hide the label but keep it in the accessibility tree. A table
   * full of "Select Spring collection" text is noise on screen and still
   * perfectly clear to a screen reader.
   */
  hideLabel?: boolean;
}) {
  const id = React.useId();
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <input
        ref={(node) => {
          if (node) node.indeterminate = Boolean(indeterminate) && !node.checked;
        }}
        id={id}
        type="checkbox"
        className={cn(
          "size-4 shrink-0 cursor-pointer appearance-none rounded-sm border border-input bg-surface",
          "checked:border-accent checked:bg-accent indeterminate:border-accent indeterminate:bg-accent",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
        {...props}
      />
      {label ? (
        <label htmlFor={id} className={hideLabel ? "sr-only" : "text-sm text-foreground"}>
          {label}
        </label>
      ) : null}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Radio group                                                               */
/* -------------------------------------------------------------------------- */

export function RadioGroup({
  legend,
  options,
  value,
  onValueChange,
  className,
  orientation = "vertical",
}: {
  legend: string;
  options: { value: string; label: React.ReactNode }[];
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  orientation?: "vertical" | "horizontal";
}) {
  return (
    <fieldset className={cn("border-0 p-0", className)}>
      <legend className="mb-2 text-sm font-semibold text-foreground">{legend}</legend>
      <RadioGroupPrimitive.Root
        value={value}
        onValueChange={onValueChange}
        orientation={orientation}
        className={cn("flex gap-4", orientation === "vertical" ? "flex-col" : "flex-row flex-wrap")}
      >
        {options.map((option) => (
          <RadioGroupPrimitive.Item
            key={option.value}
            value={option.value}
            className={cn(
              "flex items-center gap-2 text-sm text-foreground",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            )}
          >
            <span className="flex size-4 items-center justify-center rounded-pill border border-input bg-surface">
              <RadioGroupPrimitive.Indicator className="size-2 rounded-pill bg-accent" />
            </span>
            {/* The label text must be INSIDE the item: Radix renders the item
                as a <button>, and a button takes its accessible name from its
                contents, not from a sibling. */}
            {option.label}
          </RadioGroupPrimitive.Item>
        ))}
      </RadioGroupPrimitive.Root>
    </fieldset>
  );
}

/* -------------------------------------------------------------------------- */
/*  Segmented control                                                         */
/* -------------------------------------------------------------------------- */

export function SegmentedControl({
  options,
  value,
  onValueChange,
  label,
  className,
}: {
  options: { value: string; label: React.ReactNode }[];
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  className?: string;
}) {
  const name = React.useId();
  return (
    <fieldset className={cn("inline-flex gap-1 rounded-md bg-surface-2 p-1", className)}>
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <label key={option.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onValueChange(option.value)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "block rounded-sm px-3 py-1.5 text-sm font-medium transition-colors duration-100",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
                checked
                  ? "bg-surface text-foreground shadow-card"
                  : "text-muted hover:text-foreground",
              )}
            >
              {option.label}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tabs                                                                      */
/* -------------------------------------------------------------------------- */

export function Tabs({
  tabs,
  value,
  onValueChange,
  className,
}: {
  tabs: { value: string; label: React.ReactNode; count?: number }[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onValueChange} className={className}>
      <TabsPrimitive.List className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium transition-colors duration-100",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              "data-[state=active]:border-accent data-[state=active]:text-foreground",
              "data-[state=inactive]:text-muted hover:text-foreground",
            )}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span className="ml-2 rounded-sm bg-surface-2 px-1.5 py-0.5 text-xs text-muted">
                {tab.count}
              </span>
            ) : null}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/*  Search input                                                              */
/* -------------------------------------------------------------------------- */

export function SearchInput({
  value,
  onValueChange,
  placeholder = "Search…",
  label = "Search",
  className,
  id,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** Accessible name. A placeholder is not one. */
  label?: string;
  className?: string;
  id?: string;
}) {
  const reactId = React.useId();
  const inputId = id ?? reactId;
  return (
    <search className={cn("relative", className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
      />
      <input
        id={inputId}
        type="search"
        role="combobox"
        aria-label={label}
        aria-expanded="false"
        aria-controls={`${inputId}-listbox`}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-9 w-full rounded-md border border-input bg-surface-2 pl-9 pr-8 text-sm text-foreground",
          "placeholder:text-subtle focus:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
        )}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onValueChange("")}
          className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted hover:text-foreground"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      ) : null}
    </search>
  );
}
