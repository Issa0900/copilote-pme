import { Card, EmptyState } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { Company, Report } from "@/lib/types";
import { ReportView } from "../report-view";

export default async function WeeklyReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [res, companyRes] = await Promise.all([
    apiFetch(`/companies/${id}/reports/weekly`),
    apiFetch(`/companies/${id}`),
  ]);
  // « Le rapport n'a pas pu être chargé » n'est pas « aucun rapport n'existe
  // pour cette période » : les deux cas sont distingués, sinon une panne
  // passerait pour une absence d'activité (spec §64.22).
  const reportFailed = !res.ok;
  const report: Report | null = res.ok ? await res.json() : null;
  const company: Company | null = companyRes.ok ? await companyRes.json() : null;

  if (reportFailed) {
    return (
      <Card tone="danger">
        <p className="text-sm font-medium">
          Impossible de charger le rapport hebdomadaire.
        </p>
        <p className="mt-1 text-sm opacity-90">
          Le serveur n&apos;a pas répondu : cet écran ne dit pas qu&apos;aucun
          rapport n&apos;existe pour cette semaine, il n&apos;a pas pu le
          récupérer.{" "}
          <a
            href={`/entreprises/${id}/rapport/hebdomadaire`}
            className="underline"
          >
            Recharger la page
          </a>
          . Si l&apos;erreur persiste, vérifiez votre connexion réseau, puis
          signalez-la à votre administrateur en précisant l&apos;heure.
        </p>
      </Card>
    );
  }

  if (!report) {
    return <EmptyState>Aucun rapport disponible pour cette semaine.</EmptyState>;
  }

  return (
    <ReportView
      report={report}
      currency={company?.currency ?? "CAD"}
      cadenceNote="Généré à la demande (au plus une fois par semaine ISO) — pas encore de génération automatique programmée (aucun ordonnanceur/cron construit) ni d'envoi par courriel."
    />
  );
}
