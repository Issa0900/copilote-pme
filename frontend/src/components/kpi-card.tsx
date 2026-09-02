// Carte KPI du tableau de bord : valeur, variation vs période précédente et
// mini-tendance. La variation n'est affichée que lorsqu'une période
// précédente comparable existe réellement (filtre de période actif) — jamais
// une variation inventée pour remplir la carte.
import type { ReactNode } from "react";

import { Sparkline } from "@/components/sparkline";
import { TrustBadge, type TrustLevel } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { KpiVariance } from "@/lib/types";

export type KpiDirection = "up-good" | "up-bad";

/** `ratio` : métrique déjà en pourcentage, dont l'écart se lit en points. */
export type KpiUnit = "absolute" | "percentage-points";

function formatDelta(
  current: number,
  previous: number,
  unit: KpiUnit
): string | null {
  // Une métrique déjà exprimée en pourcentage (marge nette) se compare en
  // POINTS, pas en pourcentage de pourcentage : passer de 30 % à 33 %, c'est
  // « +3 points », pas « +10 % » — ce dernier chiffre est exact mais se lit
  // comme une hausse de la marge de 10 %, ce qui est faux.
  if (unit === "percentage-points") {
    const delta = current - previous;
    if (!Number.isFinite(delta)) return null;
    const sign = delta >= 0 ? "↑" : "↓";
    return `${sign} ${Math.abs(delta).toFixed(1)} pts`;
  }

  if (previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (!Number.isFinite(pct)) return null;
  const sign = pct >= 0 ? "↑" : "↓";
  return `${sign} ${Math.abs(pct).toFixed(1)} %`;
}

export function KpiCard({
  label,
  value,
  icon,
  current,
  previous,
  /** Sens de lecture : pour les dépenses, une hausse est mauvaise. */
  direction = "up-good",
  unit = "absolute",
  series,
  target,
  targetLabel,
  formatTarget,
  variance,
  currency = "CAD",
  trust,
  note,
  enterDelay = "0s",
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  /** Valeur numérique courante, pour calculer la variation. */
  current?: number;
  /** Même métrique sur la période précédente — `undefined`/`null` = pas de comparaison possible. */
  previous?: number | null;
  direction?: KpiDirection;
  unit?: KpiUnit;
  /** Série quotidienne réelle de cette métrique, pour la mini-tendance. */
  series?: number[];
  /** Objectif/budget fixé par le dirigeant (écran Paramètres) — omis s'il
   * n'en a pas défini, jamais remplacé par une valeur par défaut inventée. */
  target?: number | null;
  targetLabel?: string;
  formatTarget?: (value: number) => string;
  /** Analyse d'écarts : quelles catégories portent le mouvement de ce KPI. */
  variance?: KpiVariance | null;
  /** Devise de l'entreprise (`Company.currency`), pour les montants de
   * l'analyse d'écarts affichés par cette carte. */
  currency?: string;
  /** Niveau de fiabilité de CETTE carte, quand il diffère du « Fait » annoncé
   * pour le reste de la grille (métrique estimée faute de donnée exacte). */
  trust?: TrustLevel;
  /** Une phrase disant en quoi le chiffre est approché et pourquoi — affichée,
   * pas seulement en infobulle : une limite invisible n'en est pas une. */
  note?: string;
  enterDelay?: string;
}) {
  const delta =
    current !== undefined && previous !== undefined && previous !== null
      ? formatDelta(current, previous, unit)
      : null;

  const isUp = delta?.startsWith("↑") ?? false;
  const isGood = direction === "up-good" ? isUp : !isUp;
  const deltaClass = delta ? (isGood ? "text-success" : "text-danger") : "";

  return (
    <div
      className="animate-enter rounded-xl border border-border bg-surface p-4 shadow-sm transition-transform duration-200 ease-out hover:-translate-y-[3px] hover:shadow-md"
      style={{ "--enter-delay": enterDelay } as React.CSSProperties}
    >
      {/* La carte est étroite (grille jusqu'à 6 colonnes) : le libellé et
          l'étiquette de fiabilité passent à la ligne plutôt que de déborder. */}
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs uppercase tracking-wide text-foreground-muted">
        {icon && <span className="text-foreground-muted/80">{icon}</span>}
        {label}
        {trust && <TrustBadge level={trust} />}
      </p>
      <p className="mt-1.5 font-mono text-2xl font-semibold text-foreground">{value}</p>

      {delta ? (
        <>
          <p className={`mt-1 font-mono text-xs font-medium ${deltaClass}`}>{delta}</p>
          <p className="text-[11px] text-foreground-muted">vs période précédente</p>
        </>
      ) : (
        <p className="mt-1 text-[11px] text-foreground-muted">
          Choisissez une période pour comparer
        </p>
      )}

      {note && (
        <p className="mt-2 border-t border-border pt-2 text-[10.5px] leading-snug text-foreground-muted">
          {note}
        </p>
      )}

      {series && series.length > 1 && (
        <div className="mt-3">
          <Sparkline values={series} tone={isGood ? "success" : "danger"} />
        </div>
      )}

      {/* Analyse d'écarts : ce qui explique le mouvement. Repliée par défaut —
          la carte doit rester lisible d'un coup d'œil, le détail est là pour
          qui veut comprendre. Volontairement « facteurs » et non « causes » :
          savoir qu'une catégorie porte l'écart ne dit pas pourquoi. */}
      {variance && variance.contributors.length > 0 && (
        <details className="group mt-3 border-t border-border pt-2">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] text-foreground-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-3 w-3 transition-transform duration-200 group-open:rotate-180"
            >
              <path
                d="M6 9L12 15L18 9"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Qu&apos;est-ce qui explique cet écart ?
          </summary>
          <ul className="mt-2 space-y-1.5">
            {variance.contributors.map((c) => (
              <li key={c.category} className="flex items-baseline justify-between gap-2 text-[11px]">
                <span className="truncate text-foreground-muted">{c.category}</span>
                <span className="flex shrink-0 items-baseline gap-2 font-mono">
                  <span className={c.delta > 0 ? "text-danger" : "text-success"}>
                    {c.delta > 0 ? "+" : ""}
                    {formatCurrency(c.delta, currency)}
                  </span>
                  <span className="w-12 text-right text-foreground-muted">
                    {c.share_of_change_pct.toFixed(0)} %
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10.5px] leading-snug text-foreground-muted">
            Part de l&apos;écart total portée par chaque catégorie. Une part
            au-delà de 100 % signifie que ce mouvement est en partie compensé
            ailleurs.
          </p>
        </details>
      )}

      {target != null && target > 0 && current !== undefined && (
        <div className="mt-3 border-t border-border pt-2">
          <div className="flex items-baseline justify-between gap-2 text-[11px]">
            <span className="text-foreground-muted">
              {targetLabel ?? "Objectif"} :{" "}
              <span className="font-mono">
                {formatTarget ? formatTarget(target) : String(target)}
              </span>
            </span>
            <span className="font-mono font-medium text-foreground">
              {((current / target) * 100).toFixed(1)} %
            </span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-muted">
            <span
              className="block h-full rounded-full bg-accent"
              style={{ width: `${Math.min(100, Math.max(0, (current / target) * 100))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
