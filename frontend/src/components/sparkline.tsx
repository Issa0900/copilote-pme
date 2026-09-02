// Mini-tendance générique : une courbe nue, sans axe ni étiquette, destinée à
// tenir dans une carte KPI. N'est rendue qu'avec une vraie série (au moins 2
// points) — l'appelant ne doit jamais lui passer une série reconstituée pour
// combler l'espace (skill/SKILL.md).
const WIDTH = 100;
const HEIGHT = 28;

export function Sparkline({
  values,
  tone = "success",
}: {
  values: number[];
  tone?: "success" | "danger" | "accent";
}) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const step = WIDTH / (values.length - 1);

  const y = (v: number) =>
    range === 0 ? HEIGHT / 2 : HEIGHT - ((v - min) / range) * HEIGHT;

  const path = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(2)},${y(v).toFixed(2)}`)
    .join(" ");

  const stroke =
    tone === "danger"
      ? "var(--danger)"
      : tone === "accent"
        ? "var(--accent-strong)"
        : "var(--success)";

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className="h-7 w-full"
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
