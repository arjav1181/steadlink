"use client";

import * as React from "react";

/**
 * The range the numbers are counted over.
 *
 * The presets are the ranges a person asks for most of the time. A
 * custom range is the fourth answer: a launch that ran for six weeks, a
 * report for last quarter, a campaign that has to be compared with the
 * one before it. The dates go in the address, so the same numbers can be
 * sent to someone else and they will see the same ones.
 */
const PRESETS = [
  { value: "1", label: "Last day" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
] as const;

export function RangePicker({
  days,
  from,
  to,
  metric,
}: {
  /** The preset in days, or "custom". */
  days: string;
  from: string;
  to: string;
  metric: string;
}) {
  const [mode, setMode] = React.useState(days === "custom" ? "custom" : days);

  return (
    <form action="/analytics" className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="metric" value={metric} />
      <div>
        <label htmlFor="analytics-range" className="text-sm text-muted">
          Range
        </label>
        <select
          id="analytics-range"
          name="range"
          value={mode}
          onChange={(event) => {
            const next = event.target.value;
            setMode(next);
            // A preset is an answer on its own, so it is applied at once.
            // A custom range needs its dates first, so it waits for the
            // Apply button.
            if (next !== "custom") event.currentTarget.form?.requestSubmit();
          }}
          className="mt-1 h-9 rounded-md border border-input bg-surface px-2 text-sm text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
        >
          {PRESETS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          <option value="custom">Custom range</option>
        </select>
      </div>

      {mode === "custom" ? (
        <>
          <div>
            <label htmlFor="analytics-from" className="text-sm text-muted">
              From
            </label>
            <input
              id="analytics-from"
              name="from"
              type="date"
              defaultValue={from}
              className="mt-1 h-9 rounded-md border border-input bg-surface px-2 text-sm text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>
          <div>
            <label htmlFor="analytics-to" className="text-sm text-muted">
              To
            </label>
            <input
              id="analytics-to"
              name="to"
              type="date"
              defaultValue={to}
              className="mt-1 h-9 rounded-md border border-input bg-surface px-2 text-sm text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>
          <button
            type="submit"
            className="h-9 rounded-md bg-accent px-3 text-sm font-semibold text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Apply
          </button>
        </>
      ) : (
        <button type="submit" className="sr-only">
          Apply
        </button>
      )}
    </form>
  );
}
