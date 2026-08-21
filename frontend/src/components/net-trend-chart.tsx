"use client";

import { useId, useState } from "react";

import { formatCurrency, formatDate } from "@/lib/format";

type Point = { date: string; net: number };

const CHART_HEIGHT = 160;
const TOP_PAD = 22; // room for the peak label above the highest point
const BOTTOM_PAD = 18; // room for the baseline/legend area

export function NetTrendChart({ data }: { data: Point[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const gradientId = useId();
  const titleId = useId();

  if (data.length === 0) return null;

  const step = 100 / data.length;
  const plotTop = TOP_PAD;
  const plotBottom = CHART_HEIGHT - BOTTOM_PAD;

  const values = data.map((d) => d.net);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const range = dataMax - dataMin;

  const yFor = (v: number) =>
    range === 0
      ? (plotTop + plotBottom) / 2
      : plotBottom - ((v - dataMin) / range) * (plotBottom - plotTop);

  // Zero-crossing baseline is only meaningful when the period actually has
  // both profit and loss days; otherwise fall back to a plain floor line
  // under the plotted area, purely as a visual reference.
  const baselineY = dataMin <= 0 && dataMax >= 0 ? yFor(0) : plotBottom;

  const points = data.map((d, i) => ({
    x: i * step + step / 2,
    y: yFor(d.net),
    date: d.date,
    net: d.net,
  }));

  const peakIndex = data.reduce(
    (best, d, i) => (d.net > data[best].net ? i : best),
    0
  );
  const peak = points[peakIndex];

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L${points[points.length - 1].x},${CHART_HEIGHT} L${points[0].x},${CHART_HEIGHT} Z`
      : "";

  return (
    <div>
      <svg
        role="img"
        aria-labelledby={titleId}
        viewBox={`0 0 100 ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        className="h-40 w-full overflow-visible"
      >
        <title id={titleId}>Résultat net par jour</title>

        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>

        <line
          x1={0}
          x2={100}
          y1={baselineY}
          y2={baselineY}
          stroke="var(--border)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />

        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />}

        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="var(--accent-strong)"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}

        <circle
          cx={peak.x}
          cy={peak.y}
          r={2.4}
          fill="var(--accent-strong)"
          stroke="var(--surface)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />

        {/* hit targets: one column per point, full chart height, bigger than
            the visible line so every point stays consultable at the mouse
            or via keyboard focus regardless of point density. */}
        {points.map((p, i) => (
          <rect
            key={data[i].date}
            x={i * step}
            y={0}
            width={step}
            height={CHART_HEIGHT}
            fill="transparent"
            tabIndex={0}
            role="button"
            aria-label={`${formatDate(data[i].date)} : ${formatCurrency(data[i].net)}`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered(null)}
          />
        ))}
      </svg>

      <div className="mt-1.5 flex justify-between font-mono text-[11px] text-foreground-muted">
        <span>{formatDate(data[0].date)}</span>
        <span>
          pic — {formatDate(data[peakIndex].date)} : {formatCurrency(data[peakIndex].net)}
        </span>
        <span>{formatDate(data[data.length - 1].date)}</span>
      </div>

      <div className="relative h-6">
        {hovered !== null && (
          <div
            className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 rounded-lg border border-border bg-surface px-2 py-1 text-xs shadow-md"
            style={{
              left: `${hovered * step + step / 2}%`,
            }}
          >
            <span className="font-mono font-semibold">
              {formatCurrency(data[hovered].net)}
            </span>{" "}
            <span className="font-mono text-foreground-muted">
              {formatDate(data[hovered].date)}
            </span>
          </div>
        )}
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-foreground-muted">
          Voir en tableau
        </summary>
        <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-surface-muted">
              <tr>
                <th className="px-3 py-1.5 text-left font-medium">Date</th>
                <th className="px-3 py-1.5 text-right font-medium">Résultat net</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date} className="border-t border-border">
                  <td className="px-3 py-1.5 font-mono">{formatDate(d.date)}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                    {formatCurrency(d.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
