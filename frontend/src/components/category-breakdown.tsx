import { formatCurrency } from "@/lib/format";

type Item = { category: string; total: number };

// Palette catégorielle dédiée (globals.css) — volontairement distincte des 5
// couleurs de statut sémantique pour qu'une catégorie ne soit jamais lue
// comme une alerte. Exception scopée au donut : les jauges de score restent
// horizontales (skill/SKILL.md, révision sombre-dense du 2026-08-21).
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

const SIZE = 168;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TITLE_ID = "category-donut-title";

export function CategoryBreakdown({
  items,
  currency = "CAD",
}: {
  items: Item[];
  /** Devise de l'entreprise (`Company.currency`). */
  currency?: string;
}) {
  if (items.length === 0) return null;

  const total = items.reduce((sum, i) => sum + i.total, 0);

  let offset = 0;
  const segments = items.map((item, i) => {
    const fraction = total > 0 ? item.total / total : 0;
    const dash = fraction * CIRCUMFERENCE;
    const segment = {
      ...item,
      color: CHART_COLORS[i % CHART_COLORS.length],
      fraction,
      dasharray: `${dash} ${CIRCUMFERENCE - dash}`,
      dashoffset: -offset,
    };
    offset += dash;
    return segment;
  });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <svg
        role="img"
        aria-labelledby={TITLE_ID}
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="shrink-0 -rotate-90"
      >
        <title id={TITLE_ID}>Répartition des dépenses par catégorie</title>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--surface-muted)"
          strokeWidth={STROKE}
        />
        {segments.map((s, i) => (
          <circle
            key={s.category}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={s.color}
            strokeWidth={STROKE}
            strokeDasharray={s.dasharray}
            strokeDashoffset={s.dashoffset}
            className="animate-enter"
            style={{ "--enter-delay": `${i * 0.06}s` } as React.CSSProperties}
          />
        ))}
        <text
          x={SIZE / 2}
          y={SIZE / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="rotate-90 font-mono text-[13px] font-semibold"
          style={{ fill: "var(--foreground)", transformOrigin: "center", transformBox: "fill-box" }}
        >
          {formatCurrency(total, currency)}
        </text>
      </svg>

      <ul className="w-full space-y-2">
        {segments.map((s) => (
          <li key={s.category} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 truncate">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: s.color }}
                aria-hidden
              />
              {s.category}
            </span>
            <span className="flex shrink-0 items-center gap-2 font-mono tabular-nums text-foreground-muted">
              <span className="text-[11px]">{Math.round(s.fraction * 100)}%</span>
              {formatCurrency(s.total, currency)}
            </span>
          </li>
        ))}
      </ul>

      <details className="w-full sm:hidden">
        <summary className="cursor-pointer text-xs text-foreground-muted">Voir en tableau</summary>
        <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-surface-muted">
              <tr>
                <th className="px-3 py-1.5 text-left font-medium">Catégorie</th>
                <th className="px-3 py-1.5 text-right font-medium">Montant</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.category} className="border-t border-border">
                  <td className="px-3 py-1.5">{item.category}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                    {formatCurrency(item.total, currency)}
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
