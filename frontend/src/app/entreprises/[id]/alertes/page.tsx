import { Card, EmptyState, SectionHeading } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { ALERT_LEVEL_LABELS, ALERT_LEVEL_ORDER, ALERT_LEVEL_TONE } from "@/lib/alert-levels";
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
          {grouped.map(({ level, items }, groupIndex) => (
            <div
              key={level}
              className="animate-enter"
              style={{ "--enter-delay": `${groupIndex * 0.05}s` } as React.CSSProperties}
            >
              <SectionHeading>
                {ALERT_LEVEL_LABELS[level]} ({items.length})
              </SectionHeading>
              <ul className="space-y-2">
                {items.map((alert, i) => (
                  <Card key={i} tone={ALERT_LEVEL_TONE[level]}>
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-sm opacity-90">{alert.message}</p>
                  </Card>
                ))}
              </ul>
            </div>
          ))}
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
