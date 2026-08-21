import { Badge, Card, EmptyState, SectionHeading, StatTile, TrustBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Report } from "@/lib/types";

export function ReportView({
  report,
  cadenceNote,
}: {
  report: Report;
  cadenceNote: string;
}) {
  return (
    <div className="space-y-8">
      <p className="-mt-2 text-sm text-foreground-muted">
        Rapport du <span className="font-mono">{formatDate(report.period)}</span>
      </p>

      <div>
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

      <div>
        <SectionHeading>
          <span className="flex flex-wrap items-center gap-2">
            <TrustBadge level="fait" />
            <span>Performance</span>
          </span>
        </SectionHeading>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile
            label="Revenus"
            value={formatCurrency(report.content.performance.revenus)}
          />
          <StatTile
            label="Dépenses"
            value={formatCurrency(report.content.performance.depenses)}
          />
          <StatTile
            label="Résultat net"
            value={formatCurrency(report.content.performance.resultat_net)}
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
                ? formatCurrency(report.content.performance.panier_moyen)
                : "—"
            }
          />
        </div>
      </div>

      <div>
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
              </Card>
            ))}
          </ul>
        )}
      </div>

      <div>
        <SectionHeading>Opportunités</SectionHeading>
        <EmptyState>{report.content.opportunites.note}</EmptyState>
      </div>

      <div>
        <SectionHeading>Actualités pertinentes</SectionHeading>
        <EmptyState>{report.content.actualites.note}</EmptyState>
      </div>

      <div>
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

      <div>
        <SectionHeading>Automatisations</SectionHeading>
        <EmptyState>{report.content.automatisations.note}</EmptyState>
      </div>

      <p className="text-xs text-foreground-muted">{cadenceNote}</p>
    </div>
  );
}
