import { EmptyState } from "@/components/ui";
import { getApiUrl } from "@/lib/api";
import type { Report } from "@/lib/types";
import { ReportView } from "../report-view";

export default async function WeeklyReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const res = await fetch(`${getApiUrl()}/companies/${id}/reports/weekly`, {
    cache: "no-store",
  });
  const report: Report | null = res.ok ? await res.json() : null;

  if (!report) {
    return (
      <EmptyState>Impossible de générer le rapport pour l&apos;instant.</EmptyState>
    );
  }

  return (
    <ReportView
      report={report}
      cadenceNote="Généré à la demande (au plus une fois par semaine ISO) — pas encore de génération automatique programmée (aucun ordonnanceur/cron construit) ni d'envoi par courriel."
    />
  );
}
