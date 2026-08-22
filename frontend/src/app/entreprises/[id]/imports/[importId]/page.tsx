import { Badge, Card, EmptyState, LinkButton, PageHeader, SectionHeading } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Import, Transaction } from "@/lib/types";

export default async function ImportTransactionsPage({
  params,
}: {
  params: Promise<{ id: string; importId: string }>;
}) {
  const { id, importId } = await params;

  const [importsRes, transactionsRes] = await Promise.all([
    apiFetch(`/companies/${id}/imports`),
    apiFetch(`/companies/${id}/imports/${importId}/transactions`),
  ]);

  const imports: Import[] = importsRes.ok ? await importsRes.json() : [];
  const transactions: Transaction[] = transactionsRes.ok ? await transactionsRes.json() : [];

  const imp = imports.find((i) => i.id === importId);
  const quarantined = transactions.filter((t) => t.status === "quarantined");

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
          Lignes en attente de vérification ({quarantined.length})
        </SectionHeading>
        {quarantined.length === 0 ? (
          <EmptyState>
            Aucune ligne en quarantaine pour cet import.
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {quarantined.map((t) => (
              <Card key={t.id} tone="surveillance">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-sm">
                    {t.date ? formatDate(t.date) : "—"} ·{" "}
                    {t.amount !== null ? formatCurrency(t.amount) : "—"}
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
              </Card>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
