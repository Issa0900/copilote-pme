import { Gauge } from "@/components/gauge";
import { ListPagination } from "@/components/list-pagination";
import { Badge, Card, EmptyState, LinkButton, PageHeader, SectionHeading } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { PAGE_SIZES, parseOffset, readPageInfo } from "@/lib/pagination";
import type { Import } from "@/lib/types";
import { UploadForm } from "./upload-form";

const QUALITY_GAUGE_TONE = (score: number): "danger" | "warning" | "success" =>
  score < 60 ? "danger" : score < 85 ? "warning" : "success";

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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ offset?: string }>;
}) {
  const { id } = await params;
  const { offset: rawOffset } = await searchParams;

  // L'historique est borné par le backend (spec §64.24) : on demande une page
  // explicite et on lit `X-Total-Count` pour ne jamais présenter un début
  // d'historique comme l'historique complet.
  const limit = PAGE_SIZES.imports;
  const offset = parseOffset(rawOffset);

  const res = await apiFetch(`/companies/${id}/imports?limit=${limit}&offset=${offset}`);
  // Un échec de chargement ne doit jamais se confondre avec « aucun import » :
  // afficher un historique vide laisserait croire qu'aucune donnée n'a jamais
  // été importée, et pourrait pousser à réimporter un fichier déjà traité
  // (spec §64.22).
  const importsFailed = !res.ok;
  const imports: Import[] = res.ok ? await res.json() : [];
  const page = readPageInfo(res, imports.length, offset, limit);

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
        {importsFailed ? (
          <Card tone="danger">
            <p className="text-sm font-medium">
              Impossible de charger l&apos;historique des imports.
            </p>
            <p className="mt-1 text-sm opacity-90">
              Le serveur n&apos;a pas répondu : cette liste est indisponible, ce
              n&apos;est pas un historique vide — n&apos;en concluez pas
              qu&apos;un fichier n&apos;a pas été importé et attendez avant de
              le réimporter.{" "}
              <a href={`/entreprises/${id}/imports`} className="underline">
                Recharger la page
              </a>
              . Si l&apos;erreur persiste, vérifiez votre connexion réseau, puis
              signalez-la à votre administrateur en précisant l&apos;heure.
            </p>
          </Card>
        ) : imports.length === 0 ? (
          <EmptyState>Aucun import pour l&apos;instant.</EmptyState>
        ) : (
          <>
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
                </p>
                {imp.quality_score !== null && (
                  <div className="mt-2 max-w-xs">
                    <Gauge
                      label="Score de qualité"
                      value={imp.quality_score}
                      displayValue={`${imp.quality_score}%`}
                      tone={QUALITY_GAUGE_TONE(imp.quality_score)}
                    />
                  </div>
                )}
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
            <ListPagination
              page={page}
              basePath={`/entreprises/${id}/imports`}
              label="imports"
              note="Cet historique n'est pas affiché en entier — un fichier déjà importé peut se trouver sur une autre page."
            />
          </>
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
