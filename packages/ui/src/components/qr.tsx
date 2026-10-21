"use client";

import * as React from "react";

import { cn } from "../lib/cn";
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "../lib/image";
import { CORNER_SHAPES, DOT_PATTERNS, type QrDesign, renderQrSvg } from "../lib/qr";
import { Button } from "./button";

/* -------------------------------------------------------------------------- */
/*  QR preview                                                                */
/* -------------------------------------------------------------------------- */

export function QrPreview({
  text,
  design,
  size = 200,
  caption,
  className,
}: {
  text: string;
  design?: QrDesign;
  size?: number;
  caption?: string;
  className?: string;
}) {
  const svg = React.useMemo(() => renderQrSvg({ text, design, size }), [text, design, size]);
  return (
    <figure className={cn("m-0 inline-flex flex-col items-center gap-2", className)}>
      <div
        className="rounded-md bg-surface p-3"
        // The SVG is generated in-house from a module matrix. The only input is
        // a destination string, which is encoded into the matrix and never
        // interpolated into the markup.
        // biome-ignore lint/security/noDangerouslySetInnerHtml: generated SVG, not user markup
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {caption ? (
        <figcaption className="max-w-full truncate font-mono text-xs text-muted">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/* -------------------------------------------------------------------------- */
/*  Swatch grids                                                              */
/* -------------------------------------------------------------------------- */

function SwatchGrid<T extends string>({
  label,
  options,
  value,
  onChange,
  render,
  className,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  render: (option: T) => React.ReactNode;
  className?: string;
}) {
  const name = React.useId();
  return (
    <fieldset className={cn("grid grid-cols-4 gap-2", className)}>
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const checked = option === value;
        return (
          <label key={option} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option}
              checked={checked}
              onChange={() => onChange(option)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex size-11 items-center justify-center rounded-sm border bg-surface transition-colors duration-100",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
                checked
                  ? "border-2 border-accent bg-accent-soft"
                  : "border-border hover:bg-surface-2",
              )}
            >
              {render(option)}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

/** Sample module positions used to draw the pattern swatches. */
const DOT_POSITIONS = [
  [4, 4],
  [14, 4],
  [4, 14],
  [14, 14],
  [9, 9],
] as const;

export function PatternPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <SwatchGrid
      label="Dot pattern"
      options={DOT_PATTERNS}
      value={value}
      onChange={onChange}
      className={className}
      render={(option) => (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-foreground">
          {DOT_POSITIONS.map(([cx, cy]) =>
            option === "blob" ? (
              <circle key={`${cx}-${cy}`} cx={cx + 3} cy={cy + 3} r="2.6" />
            ) : option === "rounded" ? (
              <rect
                key={`${cx}-${cy}`}
                x={cx + 0.8}
                y={cy + 0.8}
                width="4.4"
                height="4.4"
                rx="1.6"
              />
            ) : option === "star" ? (
              <path
                key={`${cx}-${cy}`}
                d="M12 2.6l1.3 3.9 4.1.2-3.2 2.5 1.1 4-3.3-2.2-3.3 2.2 1.1-4-3.2-2.5 4.1-.2z"
                transform={`translate(${(cx - 6) / 1.6} ${(cy - 6) / 1.6}) scale(0.4)`}
              />
            ) : option === "diamond" ? (
              <path key={`${cx}-${cy}`} d={`M${cx + 3} ${cy}l3 3-3 3-3-3z`} />
            ) : (
              <rect key={`${cx}-${cy}`} x={cx + 0.6} y={cy + 0.6} width="4.8" height="4.8" />
            ),
          )}
        </svg>
      )}
    />
  );
}

export function CornerPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <SwatchGrid
      label="Corner shape"
      options={CORNER_SHAPES}
      value={value}
      onChange={onChange}
      className={className}
      render={(option) => (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-foreground">
          <path
            d={
              option === "rounded" || option === "extra_round"
                ? "M4 4h16v16H4z"
                : option === "target"
                  ? "M4 4h16v16H4zm5 5h6v6H9z"
                  : option === "concave"
                    ? "M4 4h16v16H4zm6 6h4v4h-4z"
                    : option === "leaf" || option === "leaf_inner" || option === "leaf_outer"
                      ? "M12 3c5 4 5 10 0 18 5-8 5-14 0-18z"
                      : "M4 4h16v16H4z"
            }
          />
        </svg>
      )}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Colour picker                                                             */
/* -------------------------------------------------------------------------- */

const SWATCHES = [
  "#272d36",
  "#5b6470",
  "#2f3a4a",
  "#1a6b45",
  "#4c5bd4",
  "#0f766e",
  "#b45309",
  "#b3261e",
  "#ffffff",
];

export function ColorPicker({
  label,
  value,
  onChange,
  allowTransparent,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowTransparent?: boolean;
  className?: string;
}) {
  const name = React.useId();
  const hexId = React.useId();
  const swatches = allowTransparent ? [...SWATCHES, "transparent"] : SWATCHES;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-foreground">{label}</legend>
        <div className="flex flex-wrap gap-2">
          {swatches.map((swatch) => {
            const checked = swatch.toLowerCase() === value.toLowerCase();
            const transparent = swatch === "transparent";
            return (
              <label key={swatch} className="cursor-pointer">
                <input
                  type="radio"
                  name={name}
                  value={swatch}
                  checked={checked}
                  onChange={() => onChange(swatch)}
                  className="peer sr-only"
                />
                <span
                  style={transparent ? undefined : { backgroundColor: swatch }}
                  className={cn(
                    "block size-7 rounded-sm border transition-transform duration-100",
                    "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
                    "peer-checked:ring-2 peer-checked:ring-accent peer-checked:ring-offset-2 peer-checked:ring-offset-surface",
                    transparent
                      ? "border-border bg-[repeating-conic-gradient(#e3e6ea_0_25%,#ffffff_0_50%)] bg-[length:8px_8px]"
                      : "border-border",
                  )}
                />
                <span className="sr-only">
                  {transparent ? `${label} transparent` : `${label} ${swatch}`}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="flex items-center gap-2">
        <label htmlFor={hexId} className="sr-only">
          {label} hex value
        </label>
        <input
          id={hexId}
          defaultValue={value}
          onBlur={(event) => onChange(event.target.value)}
          className="h-8 w-28 rounded-sm border border-input bg-surface px-2 font-mono text-xs uppercase focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Logo uploader                                                             */
/* -------------------------------------------------------------------------- */

export function LogoUploader({
  onFile,
  maxBytes = MAX_IMAGE_BYTES,
  className,
}: {
  onFile?: (file: File | null) => void;
  maxBytes?: number;
  className?: string;
}) {
  const [state, setState] = React.useState<"empty" | "dragging" | "uploaded" | "too-large">(
    "empty",
  );
  const inputId = React.useId();
  const [error, setError] = React.useState<string | null>(null);

  function accept(file: File | undefined) {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type as (typeof IMAGE_TYPES)[number])) {
      setState("too-large");
      setError("That file is not a PNG, a JPEG or an SVG.");
      return;
    }
    if (file.size > maxBytes) {
      setState("too-large");
      setError(
        `That image is ${Math.round(file.size / 1024)} KB. The limit is ${Math.round(maxBytes / 1024)} KB.`,
      );
      return;
    }
    setError(null);
    setState("uploaded");
    onFile?.(file);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setState("dragging");
        }}
        onDragLeave={() => setState("empty")}
        onDrop={(event) => {
          event.preventDefault();
          accept(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          state === "dragging" ? "border-accent bg-accent-soft" : "border-border bg-surface-2",
        )}
      >
        <span className="text-sm font-medium text-foreground">
          {state === "uploaded" ? "Logo added" : "Drop a logo, or choose a file"}
        </span>
        <span className="text-xs text-muted">
          PNG, JPEG or SVG. {Math.round(maxBytes / 1024)} KB maximum.
        </span>
        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          className="sr-only"
          onChange={(event) => accept(event.target.files?.[0])}
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Frame picker                                                              */
/* -------------------------------------------------------------------------- */

export function FramePicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const name = React.useId();
  const frames = ["none", "solid", "rounded", "dashed", "double"];
  return (
    <fieldset className={cn("flex gap-2", className)}>
      <legend className="sr-only">Frame</legend>
      {frames.map((frame) => {
        const checked = frame === value;
        return (
          <label key={frame} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={frame}
              checked={checked}
              onChange={() => onChange(frame)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex size-11 items-center justify-center rounded-sm border bg-surface",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
                checked
                  ? "border-2 border-accent bg-accent-soft"
                  : "border-border hover:bg-surface-2",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "size-6 border-2",
                  frame === "none" && "border-transparent",
                  frame === "solid" && "border-foreground",
                  frame === "rounded" && "rounded-md border-foreground",
                  frame === "dashed" && "border-dashed border-foreground",
                  frame === "double" && "border-4 border-double border-foreground",
                )}
              />
            </span>
            <span className="sr-only">{frame === "none" ? "No frame" : `${frame} frame`}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

/* -------------------------------------------------------------------------- */
/*  Template card                                                             */
/* -------------------------------------------------------------------------- */

export function QrTemplateCard({
  name,
  design,
  applied,
  onApply,
  onDelete,
  className,
}: {
  name: string;
  design: QrDesign;
  applied?: boolean;
  onApply?: () => void;
  onDelete?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-32 flex-col gap-2 rounded-lg border bg-surface p-2 shadow-card",
        applied ? "border-2 border-accent" : "border-border",
        className,
      )}
    >
      <button
        type="button"
        aria-pressed={applied}
        aria-label={`Apply the ${name} design`}
        onClick={onApply}
        className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <QrPreview text="https://go.arjav.is-cool.dev" design={design} size={104} />
      </button>
      <p className="truncate text-xs font-medium text-foreground">{name}</p>
      {onDelete ? (
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-danger">
          Delete
        </Button>
      ) : null}
    </div>
  );
}
