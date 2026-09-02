import { Card, PageHeader, SectionHeading } from "@/components/ui";

/** Bloc rectangulaire neutre en attente de contenu — jamais de couleur
 * sémantique (ce n'est pas un statut), juste une masse pour indiquer la
 * forme du contenu à venir. */
function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-surface-muted ${className}`} />
  );
}

/** État de chargement du tableau de bord — affiché automatiquement par
 * Next.js pendant que le Server Component attend son `Promise.all` réseau.
 * Reprend la mise en page réelle (KPI en haut, graphique/donut au milieu,
 * priorités en bas) pour éviter le saut de layout au premier rendu complet. */
export default function CompanyDashboardLoading() {
  return (
    <div>
      <PageHeader title="Tableau de bord" />

      {/* 1. KPI essentiels */}
      <div>
        <SkeletonBlock className="mb-3 h-3 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="mt-2 h-6 w-24" />
              <SkeletonBlock className="mt-3 h-8 w-full" />
            </Card>
          ))}
        </div>
      </div>

      {/* 2. Score de santé */}
      <div className="mt-8">
        <Card>
          <div className="flex flex-wrap items-center gap-6">
            <SkeletonBlock className="h-28 w-28 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-4 w-40" />
              <SkeletonBlock className="h-3 w-full max-w-md" />
              <SkeletonBlock className="h-3 w-full max-w-sm" />
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Évolution + répartition */}
      <div className="mt-8 grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div>
          <SectionHeading>Évolution financière</SectionHeading>
          <Card>
            <SkeletonBlock className="h-56 w-full" />
          </Card>
        </div>
        <div>
          <SectionHeading>Répartition par catégorie</SectionHeading>
          <Card>
            <div className="flex items-center justify-center py-4">
              <SkeletonBlock className="h-40 w-40 rounded-full" />
            </div>
          </Card>
        </div>
      </div>

      {/* 4. Priorités */}
      <div className="mt-8">
        <SkeletonBlock className="mb-3 h-3 w-56" />
        <ul className="grid gap-3 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i}>
              <Card>
                <SkeletonBlock className="h-4 w-24" />
                <SkeletonBlock className="mt-3 h-3 w-full" />
                <SkeletonBlock className="mt-2 h-3 w-5/6" />
                <SkeletonBlock className="mt-2 h-3 w-2/3" />
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
