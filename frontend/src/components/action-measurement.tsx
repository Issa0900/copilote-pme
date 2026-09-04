// Mesure avant/après d'une action (spec §32). Extrait de l'écran Centre
// d'actions pour être partagé avec le cockpit décisionnel : les deux écrans
// doivent lire un résultat mesuré de la même façon, sinon la même action
// raconterait deux histoires selon la page où on la regarde.
//
// Aucune valeur n'est recalculée ici (spec §64.29) : `baseline_value`,
// `outcome_value` et `result_pct` viennent telles quelles du backend, qui les
// fige au moment de la mesure.
import { formatCurrency, formatDate } from "@/lib/format";
import type { Action } from "@/lib/types";

/** Date au format `YYYY-MM-DD`, `days` jours après `isoDate` — pour annoncer
 * quand la mesure avant/après (spec §32) deviendra disponible. */
function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  const d = new Date(year, month - 1, day + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ActionMeasurement({
  action,
  currency,
  targetMarginPct,
}: {
  action: Action;
  currency: string;
  targetMarginPct: number | null;
}) {
  if (action.result_pct === null || action.outcome_value === null) {
    return (
      <p className="mt-2 text-xs text-foreground-muted">
        Mesure avant/après disponible le{" "}
        <span className="font-mono">{formatDate(addDays(action.baseline_end, 30))}</span> — il
        faut laisser le temps à l&apos;action de produire un effet mesurable.
      </p>
    );
  }

  // Catégorie => montant ; pas de catégorie (règle "Marge") => points de
  // marge. Jamais recalculé côté frontend (spec §64.29) — les deux valeurs
  // viennent telles quelles du backend.
  const format = (value: number) =>
    action.metric_category !== null ? formatCurrency(value, currency) : `${value.toFixed(1)} %`;
  const improved = action.result_pct > 0;
  // "Objectif atteint" (spec §32) seulement quand la mesure est la marge
  // nette : c'est le seul cas avec un objectif chiffré existant
  // (Company.target_margin_pct). Une catégorie n'a pas d'objectif dans le
  // modèle de données — afficher l'évolution, jamais un "objectif atteint"
  // inventé.
  const objective =
    action.metric_category === null && targetMarginPct !== null
      ? action.outcome_value >= targetMarginPct
        ? "Objectif atteint"
        : "Objectif non atteint"
      : null;

  return (
    <div className="mt-2 rounded-lg border border-border bg-surface-muted p-2.5 text-xs">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span>
          Avant — <span className="font-mono">{format(action.baseline_value)}</span>
        </span>
        <span>
          Après — <span className="font-mono">{format(action.outcome_value)}</span>
        </span>
        <span className={improved ? "text-success" : "text-danger"}>
          Résultat — {improved ? "+" : ""}
          {action.result_pct.toFixed(1)} %
        </span>
        {objective && (
          <span className={objective === "Objectif atteint" ? "text-success" : "text-danger"}>
            {objective}
          </span>
        )}
      </div>
    </div>
  );
}
