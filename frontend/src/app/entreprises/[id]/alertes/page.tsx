import { Badge, Card, EmptyState, SectionHeading, TrustBadge } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { amountRange, groupAlerts } from "@/lib/alert-groups";
import { ALERT_LEVEL_LABELS, ALERT_LEVEL_ORDER, ALERT_LEVEL_TONE } from "@/lib/alert-levels";
import { formatCurrency } from "@/lib/format";
import type { Alert } from "@/lib/types";

export default async function CompanyAlertsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const res = await apiFetch(`/companies/${id}/alerts`);
  const alerts: Alert[] = res.ok ? await res.json() : [];

  const grouped = ALERT_LEVEL_ORDER.map((level) => ({
    level,
    items: alerts.filter((a) => a.level === level),
  })).filter((group) => group.items.length > 0);

  return (
    <div>
      {alerts.length === 0 ? (
        <EmptyState>Aucune alerte pour l&apos;instant.</EmptyState>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ level, items }, groupIndex) => {
            const tone = ALERT_LEVEL_TONE[level];
            const entries = groupAlerts(items);
            return (
              <div
                key={level}
                className="animate-enter"
                style={{ "--enter-delay": `${groupIndex * 0.05}s` } as React.CSSProperties}
              >
                <SectionHeading>
                  {ALERT_LEVEL_LABELS[level]} ({items.length})
                </SectionHeading>
                <ul className="space-y-2">
                  {entries.map((entry, i) =>
                    entry.kind === "single" ? (
                      <Card key={i} tone={tone}>
                        <div className="mb-1">
                          <TrustBadge level="analyse" />
                        </div>
                        <p className="font-medium">{entry.alert.title}</p>
                        <p className="text-sm opacity-90">{entry.alert.message}</p>
                      </Card>
                    ) : (
                      <Card key={entry.key} tone={tone}>
                        <details className="group">
                          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
                            <div>
                              <div className="mb-1">
                                <TrustBadge level="analyse" />
                              </div>
                              <p className="font-medium">{entry.label}</p>
                              <p className="text-sm opacity-90">
                                {(() => {
                                  const range = amountRange(entry.alerts);
                                  return range
                                    ? `Montants observés : de ${formatCurrency(range.min)} à ${formatCurrency(range.max)}`
                                    : entry.alerts[0].message;
                                })()}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <Badge tone={tone}>{entry.alerts.length} alertes</Badge>
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                className="mt-0.5 h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
                              >
                                <path
                                  d="M6 9L12 15L18 9"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </div>
                          </summary>
                          <ul className="mt-3 space-y-3 border-t border-current/15 pt-3">
                            {entry.alerts.map((alert, j) => (
                              <li key={j}>
                                <p className="text-sm font-medium">{alert.title}</p>
                                <p className="text-sm opacity-90">{alert.message}</p>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </Card>
                    )
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-xs text-foreground-muted">
        Alertes calculées à la demande à partir des anomalies détectées et des
        imports (données à valider, imports échoués). Il n&apos;est pas encore
        possible de marquer une alerte comme lue ou résolue, et les
        notifications par courriel ou mobile ne sont pas encore disponibles.
        Aucune alerte « opportunité » n&apos;est encore générée pour le
        moment.
      </p>
    </div>
  );
}
