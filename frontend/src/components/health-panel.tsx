// Bloc de tête du tableau de bord : diagnostic en clair (« situation
// globale ») et score de santé décomposé par dimension.
//
// Le score reste rendu par des jauges HORIZONTALES, y compris le score global
// (skill/SKILL.md) : la jauge circulaire est réservée à la répartition d'un
// tout en catégories (donut), jamais à un score.
import { Gauge } from "@/components/gauge";
import { Badge, Card, SectionHeading, TrustBadge, type Tone } from "@/components/ui";
import type { HealthScore, HealthStatus } from "@/lib/types";

const STATUS_TONE: Record<HealthStatus, Tone> = {
  excellent: "success",
  sain: "success",
  stable: "info",
  vigilance: "surveillance",
  risque: "warning",
  critique: "danger",
};

const STATUS_LABELS: Record<HealthStatus, string> = {
  excellent: "Excellente",
  sain: "Saine",
  stable: "Stable",
  vigilance: "Vigilance",
  risque: "Risque",
  critique: "Critique",
};

// Teinte d'une dimension d'après sa note — mêmes seuils que le statut global
// pour que deux notes identiques ne soient jamais colorées différemment.
function toneForScore(score: number): Tone {
  if (score >= 80) return "success";
  if (score >= 65) return "info";
  if (score >= 50) return "surveillance";
  if (score >= 35) return "warning";
  return "danger";
}

/** Panneau unique : le diagnostic en clair à gauche, le détail du score à
 * droite. Regroupé en une seule carte plutôt que deux — le score et la phrase
 * qui l'explique disent la même chose, les séparer forçait à lire deux fois.
 * Le détail par dimension est replié : à l'accueil, le dirigeant a besoin du
 * verdict, pas du calcul — mais il doit pouvoir l'ouvrir (le score ne doit
 * jamais être une boîte noire). */
export function HealthPanel({ health }: { health: HealthScore }) {
  return (
    <Card className="animate-enter" style={{ "--enter-delay": "0s" } as React.CSSProperties}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <SectionHeading>Situation globale</SectionHeading>
            <span className="mb-3">
              <Badge tone={STATUS_TONE[health.status]}>{STATUS_LABELS[health.status]}</Badge>
            </span>
          </div>
          <p className="text-[15px] leading-relaxed text-foreground">{health.summary}</p>
        </div>

        <div className="shrink-0 lg:w-64">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold text-foreground">
              {health.score}
            </span>
            <span className="font-mono text-sm text-foreground-muted">/ 100</span>
            <span className="ml-auto text-xs text-foreground-muted">{health.label}</span>
          </div>
          <div className="mt-2">
            <Gauge
              label="Score de santé"
              value={health.score}
              displayValue={`${health.improving_count} ok · ${health.watch_count} à surveiller`}
              tone={toneForScore(health.score)}
              enterDelay="0.1s"
            />
          </div>
        </div>
      </div>

      <details className="group mt-4 border-t border-border pt-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs text-foreground-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-180">
            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Comment ce score est calculé
          <span className="ml-1">
            <TrustBadge level="analyse" />
          </span>
        </summary>

        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {health.dimensions.map((dim, i) => (
            <div key={dim.key}>
              <Gauge
                label={dim.label}
                value={dim.score}
                displayValue={String(dim.score)}
                tone={toneForScore(dim.score)}
                enterDelay={`${i * 0.04}s`}
              />
              <p className="mt-1 text-[11px] leading-snug text-foreground-muted">
                {dim.explanation}
              </p>
            </div>
          ))}
        </div>
      </details>
    </Card>
  );
}
