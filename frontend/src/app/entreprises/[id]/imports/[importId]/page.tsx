import { ListPagination } from "@/components/list-pagination";
import { Badge, Card, EmptyState, LinkButton, PageHeader, SectionHeading } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { PAGE_SIZES, formatCount, parseOffset, readPageInfo } from "@/lib/pagination";
import type { Company, Import, Transaction } from "@/lib/types";

export default async function ImportTransactionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; importId: string }>;
  searchParams: Promise<{ offset?: string }>;
}) {
  const { id, importId } = await params;
  const { offset: rawOffset } = await searchParams;

  // Le backend borne cette liste (spec §64.24) : sur un import de plusieurs
  // milliers de lignes, il en renvoie 200 par défaut. On demande donc une page
  // explicite et on lira `X-Total-Count` pour savoir ce qui reste.
  const limit = PAGE_SIZES.importTransactions;
  const offset = parseOffset(rawOffset);

  const [importsRes, transactionsRes, companyRes] = await Promise.all([
    apiFetch(`/companies/${id}/imports`),
    apiFetch(`/companies/${id}/imports/${importId}/transactions?limit=${limit}&offset=${offset}`),
    apiFetch(`/companies/${id}`),
  ]);
  const company: Company | null = companyRes.ok ? await companyRes.json() : null;
  const currency = company?.currency ?? "CAD";

  // Un échec de chargement ne doit jamais se confondre avec « aucune ligne à
  // vérifier » : c'est le mensonge le plus coûteux de l'application, car le
  // dirigeant en conclut que son fichier est parfaitement propre alors que des
  // lignes ont peut-être été mises de côté (spec §64.22). L'échec est donc
  // capturé à part et rendu dans une branche explicite, avant la branche
  // « liste vide ».
  const transactionsFailed = !transactionsRes.ok;
  const transactions: Transaction[] = transactionsRes.ok ? await transactionsRes.json() : [];
  const page = readPageInfo(transactionsRes, transactions.length, offset, limit);

  // La liste des imports ne sert ici qu'à retrouver le nom du fichier et le
  // nombre réel de lignes mises de côté : si elle échoue, le sous-titre est
  // simplement absent — on n'affiche pas de nom de remplacement, qui
  // laisserait croire qu'on regarde le bon fichier.
  const imports: Import[] = importsRes.ok ? await importsRes.json() : [];

  const imp = imports.find((i) => i.id === importId);
  // Le filtre « quarantaine » ne porte que sur les lignes de la page courante :
  // ce compteur décrit ce qui est affiché, pas l'import entier. Le total réel
  // vient de l'import lui-même (`rows_quarantined`), calculé côté serveur sur
  // toutes les lignes.
  const quarantined = transactions.filter((t) => t.status === "quarantined");
  const quarantinedTotal = imp?.rows_quarantined ?? null;

  const headingCount = transactionsFailed
    ? null
    : quarantinedTotal !== null
      ? quarantinedTotal
      : page.truncated
        ? null
        : quarantined.length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Lignes en quarantaine"
        subtitle={imp ? imp.file_name : undefined}
        actions={
          <LinkButton href={`/entreprises/${id}/imports`} variant="ghost" size="sm">
            Retour aux imports
          </LinkButton>
        }
      />

      <div className="animate-enter" style={{ "--enter-delay": "0s" } as React.CSSProperties}>
        <SectionHeading>
          {headingCount === null
            ? "Lignes en attente de vérification"
            : `Lignes en attente de vérification (${formatCount(headingCount)})`}
        </SectionHeading>
        {transactionsFailed ? (
          <Card tone="danger">
            <p className="text-sm font-medium">
              Impossible de charger les lignes de cet import.
            </p>
            <p className="mt-1 text-sm opacity-90">
              Le serveur n&apos;a pas répondu : la qualité de cet import
              n&apos;a pas pu être vérifiée. N&apos;en concluez pas que votre
              fichier est propre — des lignes ont peut-être été mises de côté
              sans que cet écran puisse vous les montrer.{" "}
              <a
                href={`/entreprises/${id}/imports/${importId}`}
                className="underline"
              >
                Recharger la page
              </a>
              . Si l&apos;erreur persiste, vérifiez votre connexion réseau, puis
              signalez-la à votre administrateur en précisant l&apos;heure.
            </p>
          </Card>
        ) : (
          <>
            {/* Le fichier n'est pas parcouru en entier : le dire avant la
                liste, sinon un écran vide ou court passe pour un fichier
                propre alors que seules les 200 premières lignes ont été
                examinées. */}
            {page.truncated && (
              <Card tone="surveillance" className="mb-3">
                <p className="text-sm font-medium">
                  Cet écran n&apos;examine qu&apos;une partie du fichier.
                </p>
                <p className="mt-1 text-sm opacity-90">
                  Les lignes affichées ci-dessous proviennent des lignes{" "}
                  <span className="font-mono">{formatCount(page.first)}</span> à{" "}
                  <span className="font-mono">{formatCount(page.last)}</span>
                  {page.total !== null && (
                    <>
                      {" "}
                      sur <span className="font-mono">{formatCount(page.total)}</span>
                    </>
                  )}{" "}
                  du fichier.{" "}
                  {page.hasNext
                    ? "D'autres lignes à vérifier peuvent se trouver plus loin : parcourez les pages suivantes avant de conclure que ce fichier est propre."
                    : "Les lignes précédentes du fichier ne sont pas examinées ici : revenez aux pages précédentes avant de conclure que ce fichier est propre."}
                  {quarantinedTotal !== null && (
                    <>
                      {" "}
                      Au total, cet import compte{" "}
                      <span className="font-mono">{formatCount(quarantinedTotal)}</span>{" "}
                      ligne(s) en attente de vérification, dont{" "}
                      <span className="font-mono">{formatCount(quarantined.length)}</span>{" "}
                      sur cette page.
                    </>
                  )}
                </p>
              </Card>
            )}

            {quarantined.length === 0 ? (
              <EmptyState>
                {page.truncated
                  ? "Aucune ligne en attente de vérification parmi les lignes examinées ici — le reste du fichier n'a pas été parcouru sur cette page."
                  : "Aucune ligne en quarantaine pour cet import."}
              </EmptyState>
            ) : (
              <ul className="space-y-2">
                {quarantined.map((t) => (
                  <Card key={t.id} tone="surveillance">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono text-sm">
                        {t.date ? formatDate(t.date) : "—"} ·{" "}
                        {t.amount !== null ? formatCurrency(t.amount, currency) : "—"}
                      </p>
                      {t.category && <Badge tone="neutral">{t.category}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-foreground-muted">
                      {t.description ?? "Aucune description"}
                    </p>
                    {t.quarantine_reasons && t.quarantine_reasons.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {t.quarantine_reasons.map((reason, i) => (
                          <Badge key={i} tone="surveillance">
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {/* Le motif nomme la CATÉGORIE du problème ("date
                        manquante ou illisible") sans jamais montrer la
                        valeur qui a fait échouer le parsing — repliée par
                        défaut (potentiellement de nombreuses colonnes), mais
                        nécessaire pour vérifier ou corriger sans rouvrir le
                        fichier source. */}
                    {t.raw_data && Object.keys(t.raw_data).length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-foreground-muted">
                          Voir les valeurs brutes de la ligne
                        </summary>
                        <dl className="mt-1.5 space-y-0.5 text-xs">
                          {Object.entries(t.raw_data).map(([column, value]) => (
                            <div key={column} className="flex gap-2">
                              <dt className="shrink-0 font-medium text-foreground-muted">
                                {column} :
                              </dt>
                              <dd className="font-mono">{value ?? "—"}</dd>
                            </div>
                          ))}
                        </dl>
                      </details>
                    )}
                  </Card>
                ))}
              </ul>
            )}

            <ListPagination
              page={page}
              basePath={`/entreprises/${id}/imports/${importId}`}
              label="lignes du fichier"
              note="Seules les lignes de cette page ont été examinées — passez à la page suivante pour vérifier la suite du fichier."
            />
          </>
        )}
      </div>
    </div>
  );
}
