"use client";

import type { SeriesPoint } from "@steadlink/data";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS = "var(--color-chart-axis)";
const GRID = "var(--color-chart-grid)";
const SERIES = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number; name?: string; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm bg-accent px-2.5 py-1.5 text-xs text-accent-foreground shadow-pop">
      {label ? <p className="font-semibold">{label}</p> : null}
      {payload.map((entry) => (
        <p key={entry.name ?? entry.color ?? String(entry.value)}>
          {entry.name ? `${entry.name}: ` : ""}
          {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  );
}

/** A line or area over time. */
export function TimeSeries({
  data,
  variant = "area",
  height = 180,
  label = "Engagements",
}: {
  data: SeriesPoint[];
  variant?: "line" | "area";
  height?: number;
  label?: string;
}) {
  const Chart = variant === "area" ? AreaChart : LineChart;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="series-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES[0]} stopOpacity={0.24} />
              <stop offset="100%" stopColor={SERIES[0]} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: AXIS, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            minTickGap={24}
          />
          <YAxis tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: GRID }} />
          {variant === "area" ? (
            <Area
              type="monotone"
              dataKey="value"
              name={label}
              stroke={SERIES[0]}
              strokeWidth={2}
              fill="url(#series-fill)"
              dot={false}
              isAnimationActive={false}
            />
          ) : (
            <Line
              type="monotone"
              dataKey="value"
              name={label}
              stroke={SERIES[0]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

/** Vertical bars, for a small categorical set. */
export function CategoryBars({
  data,
  height = 180,
  horizontal = false,
}: {
  data: { label: string; value: number }[];
  height?: number;
  horizontal?: boolean;
}) {
  if (horizontal) {
    const max = Math.max(...data.map((row) => row.value), 1);
    return (
      <ul className="flex flex-col gap-2">
        {data.map((row, index) => (
          <li key={row.label} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-xs text-muted">{row.label}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-pill bg-surface-3">
              <span
                className="block h-full rounded-pill"
                style={{
                  width: `${(row.value / max) * 100}%`,
                  background: SERIES[index % SERIES.length],
                }}
              />
            </span>
            <span className="w-12 shrink-0 text-right text-xs tabular-nums text-foreground">
              {row.value.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: AXIS, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: GRID }}
          />
          <YAxis tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: GRID }} />
          <Bar dataKey="value" name="Engagements" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((row, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: the position picks the colour, so it is part of the identity
              <Cell key={`${row.label}-${index}`} fill={SERIES[index % SERIES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * A donut, for a share breakdown.
 *
 * Hand-drawn SVG rather than a chart library: a pie needs an arc, and every
 * charting library wants a different API for one. The arcs are computed here.
 */
export function Donut({
  data,
  height = 180,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const total = data.reduce((sum, row) => sum + row.value, 0) || 1;
  const radius = height / 2 - 4;
  const stroke = 20;
  const circumference = 2 * Math.PI * (radius - stroke / 2);
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative shrink-0" style={{ height, width: height }}>
        <svg
          viewBox={`0 0 ${height} ${height}`}
          width={height}
          height={height}
          role="img"
          aria-label={`Share by ${data.map((row) => row.label).join(", ")}`}
        >
          <g transform={`translate(${height / 2} ${height / 2}) rotate(-90)`}>
            <circle
              r={radius - stroke / 2}
              fill="none"
              stroke="var(--color-surface-3)"
              strokeWidth={stroke}
            />
            {data.map((row, index) => {
              const fraction = row.value / total;
              const dash = fraction * circumference;
              const element = (
                <circle
                  key={row.label}
                  r={radius - stroke / 2}
                  fill="none"
                  stroke={SERIES[index % SERIES.length]}
                  strokeWidth={stroke}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += dash;
              return element;
            })}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-foreground">{total.toLocaleString()}</span>
          <span className="text-xs text-muted">total</span>
        </div>
      </div>
      <ul className="min-w-40 flex-1 space-y-1.5">
        {data.map((row, index) => (
          <li key={row.label} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-xs"
              style={{ background: SERIES[index % SERIES.length] }}
            />
            <span className="min-w-0 flex-1 truncate text-muted">{row.label}</span>
            <span className="shrink-0 tabular-nums text-foreground">
              {Math.round((row.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A tiny inline trend line. */
export function Sparkline({
  data,
  width = 96,
  height = 32,
}: {
  data: SeriesPoint[];
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="overflow-visible"
    >
      <polyline
        points={points}
        fill="none"
        stroke={SERIES[0]}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </svg>
  );
}
