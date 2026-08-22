import { Badge, Card, EmptyState, LinkButton, PageHeader, SectionHeading } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { Import } from "@/lib/types";
import { UploadForm } from "./upload-form";

const STATUS_LABELS: Record<string, string> = {
  complete: "Complété",
  echoue: "Échoué",
  en_cours: "En cours",
  en_quarantaine: "En attente de vérification",
};

const STATUS_TONE: Record<string, "success" | "danger" | "neutral" | "surveillance"> = {
  complete: "success",
  echoue: "danger",
  en_cours: "neutral",
  en_quarantaine: "surveillance",
};

const PROFILE_LABELS: Record<string, string> = {
  generique: "Générique",
  ventes_pos: "Ventes (POS)",
};

const CONNECTORS = ["Square", "Lightspeed", "Banque"];

export default async function CompanyImportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const res = await apiFetch(`/companies/${id}/imports`);
  const imports: Import[] = res.ok ? await res.json() : [];

  return (
    <div className="space-y-8">
      <PageHeader title="Import" />
      <div className="animate-enter" style={{ "--enter-delay": "0s" } as React.CSSProperties}>
        <SectionHeading>Importer un fichier</SectionHeading>
        <Card>
          <UploadForm companyId={id} />
          <p className="mt-3 text-xs text-foreground-muted">
            Formats supportés au MVP : CSV, XLSX, XLS, ODS, TSV, JSON, XML, PDF texte natif.
          </p>
        </Card>
      </div>

      <div className="animate-enter" style={{ "--enter-delay": "0.05s" } as React.CSSProperties}>
        <SectionHeading>Historique des imports</SectionHeading>
        {imports.length === 0 ? (
          <EmptyState>Aucun import pour l&apos;instant.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {imports.map((imp) => (
              <Card key={imp.id}>
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 font-medium">
                    {imp.file_name}
                    <Badge tone="neutral">{PROFILE_LABELS[imp.profile] ?? imp.profile}</Badge>
                  </p>
                  <Badge tone={STATUS_TONE[imp.status] ?? "neutral"}>
                    {STATUS_LABELS[imp.status] ?? imp.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-foreground-muted">
                  <span className="font-mono">{imp.rows_processed}</span> ligne(s) ·{" "}
                  <span className="font-mono">{imp.rows_quarantined}</span> en
                  attente de vérification
                  {imp.quality_score !== null && (
                    <>
                      {" "}
                      · score de qualité{" "}
                      <span className="font-mono">{imp.quality_score}%</span>
                    </>
                  )}
                </p>
                {imp.error_message && (
                  <p className="mt-1 text-xs text-danger">{imp.error_message}</p>
                )}
                {imp.rows_quarantined > 0 && (
                  <div className="mt-3">
                    <LinkButton
                      href={`/entreprises/${id}/imports/${imp.id}`}
                      variant="ghost"
                      size="sm"
                    >
                      Voir les lignes en attente de vérification
                    </LinkButton>
                  </div>
                )}
              </Card>
            ))}
          </ul>
        )}
      </div>

      <div className="animate-enter" style={{ "--enter-delay": "0.1s" } as React.CSSProperties}>
        <SectionHeading>Connecteurs</SectionHeading>
        <Card>
          <ul className="space-y-2.5">
            {CONNECTORS.map((name) => (
              <li key={name} className="flex items-center justify-between text-sm opacity-60">
                <span>{name}</span>
                <Badge tone="neutral">Bientôt disponible</Badge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-foreground-muted">
            La connexion directe à ces sources arrivera dans une prochaine phase — pour
            l&apos;instant, l&apos;import de fichier ci-dessus est la seule façon d&apos;ajouter des
            données.
          </p>
        </Card>
      </div>
    </div>
  );
}
