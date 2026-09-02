import { Badge, Card, EmptyState, SectionHeading, StatTile, TrustBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Report } from "@/lib/types";

export function ReportView({
  report,
  cadenceNote,
  currency = "CAD",
}: {
  report: Report;
  cadenceNote: string;
  /** Devise de l'entreprise (`Company.currency`). */
  currency?: string;
}) {
  return (
    <div className="space-y-8">
      <p
        className="animate-enter -mt-2 text-sm text-foreground-muted"
        style={{ "--enter-delay": "0s" } as React.CSSProperties}
      >
        Rapport du <span className="font-mono">{formatDate(report.period)}</span>
      </p>

      <div className="animate-enter" style={{ "--enter-delay": "0.05s" } as React.CSSProperties}>
        <SectionHeading>
          <span className="flex flex-wrap items-center gap-2">
            <TrustBadge level="fait" />
            <span>Résumé</span>
          </span>
        </SectionHeading>
        <p className="mb-2 text-sm">{report.content.resume.etat_general}</p>
        <ul className="list-inside list-disc text-sm text-foreground-muted">
          {report.content.resume.evenements_importants.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </div>

      <div className="animate-enter" style={{ "--enter-delay": "0.1s" } as React.CSSProperties}>
        <SectionHeading>
          <span className="flex flex-wrap items-center gap-2">
            <TrustBadge level="fait" />
            <span>Performance</span>
          </span>
        </SectionHeading>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile
            label="Revenus"
            value={formatCurrency(report.content.performance.revenus, currency)}
          />
          <StatTile
            label="Dépenses"
            value={formatCurrency(report.content.performance.depenses, currency)}
          />
          <StatTile
            label="Résultat net"
            value={formatCurrency(report.content.performance.resultat_net, currency)}
            tone={report.content.performance.resultat_net >= 0 ? "success" : "danger"}
          />
          <StatTile
            label="Transactions"
            value={String(report.content.performance.transactions_validees)}
          />
          <StatTile
            label="Panier moyen"
            value={
              report.content.performance.panier_moyen !== null
                ? formatCurrency(report.content.performance.panier_moyen, currency)
                : "—"
            }
          />
        </div>
      </div>

      <div className="animate-enter" style={{ "--enter-delay": "0.15s" } as React.CSSProperties}>
        <SectionHeading>Risques ({report.content.risques.length})</SectionHeading>
        {report.content.risques.length === 0 ? (
          <EmptyState>Aucun risque en attente.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {report.content.risques.map((r, i) => (
              <Card key={i} tone="danger">
                <div className="mb-1">
                  <TrustBadge level="analyse" />
                </div>
                <Badge tone="danger">{r.priority}</Badge>
                <span className="ml-2 text-sm">{r.situation}</span>
                {/* Un rapport est censé se lire seul, sans le dashboard en
                    direct : le pourquoi/l'impact/l'action doivent être là,
                    pas seulement le constat et la priorité. */}
                <p className="mt-1.5 text-sm leading-snug">
                  <span className="font-medium">Pourquoi — </span>
                  <span className="opacity-90">{r.analysis}</span>
                </p>
                <p className="mt-1.5 text-sm leading-snug">
                  <span className="font-medium">Impact — </span>
                  <span className="opacity-90">{r.impact}</span>
                </p>
                <p className="mt-1.5 text-sm leading-snug">
                  <span className="font-medium">Action — </span>
                  <span className="opacity-90">{r.action}</span>
                </p>
              </Card>
            ))}
          </ul>
        )}
      </div>

      <div className="animate-enter" style={{ "--enter-delay": "0.2s" } as React.CSSProperties}>
        <SectionHeading>Opportunités</SectionHeading>
        <EmptyState>{report.content.opportunites.note}</EmptyState>
      </div>

      <div className="animate-enter" style={{ "--enter-delay": "0.25s" } as React.CSSProperties}>
        <SectionHeading>Actualités pertinentes</SectionHeading>
        <EmptyState>{report.content.actualites.note}</EmptyState>
      </div>

      <div className="animate-enter" style={{ "--enter-delay": "0.3s" } as React.CSSProperties}>
        <SectionHeading>Actions</SectionHeading>
        {report.content.actions.length === 0 ? (
          <EmptyState>Aucune action prioritaire.</EmptyState>
        ) : (
          <ol className="list-inside list-decimal space-y-1 text-sm">
            {report.content.actions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ol>
        )}
      </div>

      <div className="animate-enter" style={{ "--enter-delay": "0.35s" } as React.CSSProperties}>
        <SectionHeading>Automatisations</SectionHeading>
        <EmptyState>{report.content.automatisations.note}</EmptyState>
      </div>

      <p
        className="animate-enter text-xs text-foreground-muted"
        style={{ "--enter-delay": "0.4s" } as React.CSSProperties}
      >
        {cadenceNote}
      </p>
    </div>
  );
}
