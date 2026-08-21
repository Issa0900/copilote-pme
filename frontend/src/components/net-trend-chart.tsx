"use client";

import { useId, useState } from "react";

import { formatCurrency, formatDate } from "@/lib/format";

type Point = { date: string; net: number };

const CHART_HEIGHT = 160;
const BASELINE_Y = CHART_HEIGHT / 2;
const MAX_BAR_WIDTH = 24;
const GAP = 2;

export function NetTrendChart({ data }: { data: Point[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const titleId = useId();

  if (data.length === 0) return null;

  const maxAbs = Math.max(...data.map((d) => Math.abs(d.net)), 1);
  const halfHeight = CHART_HEIGHT / 2 - 20; // leave room for extreme labels
  const barWidth = Math.min(MAX_BAR_WIDTH, 100 / data.length - GAP);
  const step = 100 / data.length;

  const maxIndex = data.reduce(
    (best, d, i) => (Math.abs(d.net) > Math.abs(data[best].net) ? i : best),
    0
  );

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

        <line
          x1={0}
          x2={100}
          y1={BASELINE_Y}
          y2={BASELINE_Y}
          stroke="var(--border)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />

        {data.map((d, i) => {
          const h = (Math.abs(d.net) / maxAbs) * halfHeight;
          const x = i * step + (step - barWidth) / 2;
          const isPositive = d.net >= 0;
          const y = isPositive ? BASELINE_Y - h : BASELINE_Y;
          const color =
            d.net === 0
              ? "var(--border)"
              : isPositive
                ? "var(--info)"
                : "var(--danger)";
          const isExtreme = i === maxIndex;
          const isHovered = hovered === i;

          return (
            <g key={d.date}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(h, 1)}
                rx={1.5}
                fill={color}
                opacity={isHovered ? 1 : 0.9}
              />
              {isExtreme && (
                <text
                  x={x + barWidth / 2}
                  y={isPositive ? y - 4 : y + h + 10}
                  fontSize={6}
                  textAnchor="middle"
                  fill="var(--foreground-muted)"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {formatCurrency(d.net)}
                </text>
              )}
              {/* hit target: full column height, bigger than the visible bar */}
              <rect
                x={i * step}
                y={0}
                width={step}
                height={CHART_HEIGHT}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${formatDate(d.date)} : ${formatCurrency(d.net)}`}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
              />
            </g>
          );
        })}
      </svg>

      <div className="relative h-6">
        {hovered !== null && (
          <div
            className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 rounded-md border border-border bg-surface px-2 py-1 text-xs shadow-md"
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
