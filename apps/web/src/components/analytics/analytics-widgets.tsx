"use client";

import { Card } from "@golink/ui";
import * as React from "react";

import { CategoryBars, Donut, TimeSeries } from "@/components/charts";

interface Overview {
  total: number;
  previousTotal: number;
  series: { date: string; value: number }[];
  byCountry: { key: string; label: string; value: number; share: number }[];
  byCity: { key: string; label: string; value: number; share: number }[];
  byDevice: { key: string; label: string; value: number; share: number }[];
  byReferrer: { key: string; label: string; value: number; share: number }[];
  byOs: { key: string; label: string; value: number; share: number }[];
  byBrowser: { key: string; label: string; value: number; share: number }[];
  topLinks: { id: string; code: string; title: string | null; value: number }[];
}

/** The analytics widget grid, mirroring the original's four panels. */
export function AnalyticsWidgets({ overview }: { overview: Overview }) {
  const [metric, setMetric] = React.useState<"engagements" | "clicks" | "scans">("engagements");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Over time</h2>
            <p className="mt-1 text-sm text-muted">
              {overview.total.toLocaleString()} in this range.
            </p>
          </div>
          <label htmlFor="metric" className="sr-only">
            Metric
          </label>
          <select
            id="metric"
            value={metric}
            onChange={(event) => setMetric(event.target.value as typeof metric)}
            className="h-8 rounded-sm border border-input bg-surface px-2 text-sm text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
          >
            <option value="engagements">Engagements</option>
            <option value="clicks">Clicks</option>
            <option value="scans">Scans</option>
          </select>
        </div>
        <div className="mt-4">
          <TimeSeries data={overview.series} label={metric} />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground">By location</h2>
        <p className="mt-1 text-sm text-muted">Where the clicks came from.</p>
        <div className="mt-4">
          {overview.byCountry.length === 0 ? (
            <p className="text-sm text-muted">No clicks in this range yet.</p>
          ) : (
            <Donut
              data={overview.byCountry
                .slice(0, 6)
                .map((row) => ({ label: row.label, value: row.value }))}
            />
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground">By referrer</h2>
        <p className="mt-1 text-sm text-muted">Which sources brought people in.</p>
        <div className="mt-4">
          {overview.byReferrer.length === 0 ? (
            <p className="text-sm text-muted">No clicks in this range yet.</p>
          ) : (
            <CategoryBars
              horizontal
              data={overview.byReferrer
                .slice(0, 8)
                .map((row) => ({ label: row.label, value: row.value }))}
            />
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground">By device</h2>
        <p className="mt-1 text-sm text-muted">What they were reading it on.</p>
        <div className="mt-4">
          {overview.byDevice.length === 0 ? (
            <p className="text-sm text-muted">No clicks in this range yet.</p>
          ) : (
            <CategoryBars
              data={overview.byDevice.map((row) => ({ label: row.label, value: row.value }))}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
