import { ListPagination } from "@/components/list-pagination";
import { Badge, Card, EmptyState, PageHeader, SectionHeading } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { ACTION_STATUS_LABELS, ACTION_STATUS_ORDER, ACTION_STATUS_TONE } from "@/lib/action-status";
import { formatCurrency, formatDate } from "@/lib/format";
import { PAGE_SIZES, parseOffset, readPageInfo } from "@/lib/pagination";
import type { Action, Company } from "@/lib/types";
import { ActionStatusSelect } from "./action-status-select";

/** Date au format `YYYY-MM-DD`, `days` jours après `isoDate` — pour annoncer
 * quand la mesure avant/après (spec §32) deviendra disponible. */
function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  const d = new Date(year, month - 1, day + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function MeasurementBlock({
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

export default async function CompanyActionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ offset?: string }>;
}) {
  const { id } = await params;
  const { offset: rawOffset } = await searchParams;

  const limit = PAGE_SIZES.actions;
  const offset = parseOffset(rawOffset);

  const [res, companyRes] = await Promise.all([
    apiFetch(`/companies/${id}/actions?limit=${limit}&offset=${offset}`),
    apiFetch(`/companies/${id}`),
  ]);
  const actionsFailed = !res.ok;
  const actions: Action[] = res.ok ? await res.json() : [];
  const page = readPageInfo(res, actions.length, offset, limit);
  const company: Company | null = companyRes.ok ? await companyRes.json() : null;
  const currency = company?.currency ?? "CAD";
  const targetMarginPct = company?.target_margin_pct ?? null;

  const grouped = ACTION_STATUS_ORDER.map((status) => ({
    status,
    items: actions.filter((a) => a.status === status),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <PageHeader
        title="Centre d'actions"
        subtitle="Les recommandations que vous avez décidé de suivre — et ce qu'elles ont vraiment donné, une fois assez de temps écoulé."
      />
      {actionsFailed ? (
        <Card tone="danger">
          <p className="text-sm font-medium">Impossible de charger le centre d&apos;actions.</p>
          <p className="mt-1 text-sm opacity-90">
            Le serveur n&apos;a pas répondu : cet écran ne dit pas qu&apos;il n&apos;y a aucune
            action, il n&apos;a pas pu le vérifier.{" "}
            <a href={`/entreprises/${id}/actions`} className="underline">
              Recharger la page
            </a>
            . Si l&apos;erreur persiste, vérifiez votre connexion réseau, puis signalez-la à votre
            administrateur en précisant l&apos;heure.
          </p>
        </Card>
      ) : actions.length === 0 ? (
        <EmptyState>
          Aucune action pour l&apos;instant. Créez-en une depuis une recommandation.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ status, items }, groupIndex) => (
            <div
              key={status}
              className="animate-enter"
              style={{ "--enter-delay": `${groupIndex * 0.05}s` } as React.CSSProperties}
            >
              <SectionHeading>
                {ACTION_STATUS_LABELS[status]} ({items.length}
                {page.truncated ? " sur cette page" : ""})
              </SectionHeading>
              <ul className="space-y-2">
                {items.map((action) => (
                  <Card key={action.id} tone={ACTION_STATUS_TONE[status]}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{action.title}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground-muted">
                          <Badge tone="neutral">{action.priority}</Badge>
                          {action.due_date && (
                            <span>
                              Échéance :{" "}
                              <span className="font-mono">{formatDate(action.due_date)}</span>
                            </span>
                          )}
                          {action.metric_category && (
                            <span>Catégorie suivie : {action.metric_category}</span>
                          )}
                        </p>
                      </div>
                      <ActionStatusSelect
                        companyId={id}
                        actionId={action.id}
                        status={action.status}
                      />
                    </div>
                    <MeasurementBlock
                      action={action}
                      currency={currency}
                      targetMarginPct={targetMarginPct}
                    />
                  </Card>
                ))}
              </ul>
            </div>
          ))}
          <ListPagination
            page={page}
            basePath={`/entreprises/${id}/actions`}
            label="actions"
            note="D'autres actions vous attendent sur la page suivante."
          />
        </div>
      )}
    </div>
  );
}
