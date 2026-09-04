import { ActionMeasurement } from "@/components/action-measurement";
import { ListPagination } from "@/components/list-pagination";
import { Badge, Card, EmptyState, PageHeader, SectionHeading } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { ACTION_STATUS_LABELS, ACTION_STATUS_ORDER, ACTION_STATUS_TONE } from "@/lib/action-status";
import { formatDate } from "@/lib/format";
import { PAGE_SIZES, parseOffset, readPageInfo } from "@/lib/pagination";
import type { Action, Company } from "@/lib/types";
import { ActionStatusSelect } from "./action-status-select";

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
                    <ActionMeasurement
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
