import { Badge, Card, EmptyState, SectionHeading } from "@/components/ui";
import { getApiUrl } from "@/lib/api";
import type { Import } from "@/lib/types";
import { UploadForm } from "./upload-form";

const STATUS_LABELS: Record<string, string> = {
  complete: "Complété",
  echoue: "Échoué",
  en_cours: "En cours",
  en_quarantaine: "En quarantaine",
};

const STATUS_TONE: Record<string, "success" | "danger" | "neutral" | "surveillance"> = {
  complete: "success",
  echoue: "danger",
  en_cours: "neutral",
  en_quarantaine: "surveillance",
};

export default async function CompanyImportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const res = await fetch(`${getApiUrl()}/companies/${id}/imports`, {
    cache: "no-store",
  });
  const imports: Import[] = res.ok ? await res.json() : [];

  return (
    <div className="space-y-8">
      <div>
        <SectionHeading>Importer un fichier</SectionHeading>
        <Card>
          <UploadForm companyId={id} />
          <p className="mt-3 text-xs text-foreground-muted">
            Formats supportés au MVP : CSV, XLSX, XLS, TSV, PDF texte natif.
          </p>
        </Card>
      </div>

      <div>
        <SectionHeading>Historique des imports</SectionHeading>
        {imports.length === 0 ? (
          <EmptyState>Aucun import pour l&apos;instant.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {imports.map((imp) => (
              <Card key={imp.id}>
                <div className="flex items-center justify-between">
                  <p className="font-medium">{imp.file_name}</p>
                  <Badge tone={STATUS_TONE[imp.status] ?? "neutral"}>
                    {STATUS_LABELS[imp.status] ?? imp.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-foreground-muted">
                  <span className="font-mono">{imp.rows_processed}</span> ligne(s) ·{" "}
                  <span className="font-mono">{imp.rows_quarantined}</span> en
                  quarantaine
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
              </Card>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
