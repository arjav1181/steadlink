"use client";

import type { SeriesPoint } from "@steadlink/data";
import { SegmentedControl } from "@steadlink/ui";
import * as React from "react";

import { TimeSeries } from "./charts";

/** The engagement chart with its range switch. */
export function EngagementChart({ data }: { data: SeriesPoint[] }) {
  const [range, setRange] = React.useState("7d");
  const ranges: Record<string, number> = { "1d": 1, "7d": 7, "30d": 30 };
  const days = ranges[range] ?? 7;

  const visible = React.useMemo(() => data.slice(-days), [data, days]);
  const total = visible.reduce((sum, point) => sum + point.value, 0);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          <span className="font-semibold text-foreground">{total.toLocaleString()}</span> in the
          last {days} {days === 1 ? "day" : "days"}
        </p>
        <SegmentedControl
          label="Date range"
          value={range}
          onValueChange={setRange}
          options={[
            { value: "1d", label: "1d" },
            { value: "7d", label: "7d" },
            { value: "30d", label: "30d" },
          ]}
        />
      </div>
      <TimeSeries data={visible} />
    </div>
  );
}
