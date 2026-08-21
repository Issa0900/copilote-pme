import type { Recommendation } from "@/lib/types";

// Regroupe les recommandations qui se ressemblent trop pour justifier une
// carte chacune (ex. 23 recommandations issues d'anomalies « Salaires » à des
// priorités variées), sur le même principe que le regroupement des alertes
// (voir alert-groups.ts) :
// - Le regroupement se fait par catégorie de transaction SEULE — comme pour
//   les alertes — pour que des recommandations de priorités différentes mais
//   de même origine se retrouvent bien dans le même groupe. Le ton (ton du
//   Badge/Card) du groupe reprend la priorité la plus élevée qu'il contient,
//   pour ne pas masquer une recommandation urgente derrière un ton plus doux.
// - Les recommandations sans catégorie (`category: null`, essentiellement les
//   recommandations créées avant l'ajout du champ) restent toujours affichées
//   individuellement.
// - Un regroupement n'a de sens qu'à partir de 2 recommandations ; en
//   dessous, la recommandation reste affichée seule.
export type RecommendationGroupEntry =
  | { kind: "single"; recommendation: Recommendation }
  | {
      kind: "group";
      key: string;
      category: string;
      priority: Recommendation["priority"];
      recommendations: Recommendation[];
    };

// Ordre du plus urgent au moins urgent — reprend l'ordre déjà utilisé pour le
// ton des badges de priorité (PRIORITY_TONE dans recommandations/page.tsx).
const PRIORITY_ORDER: Recommendation["priority"][] = [
  "urgente",
  "élevée",
  "moyenne",
  "faible",
];

function highestPriority(recommendations: Recommendation[]): Recommendation["priority"] {
  for (const priority of PRIORITY_ORDER) {
    if (recommendations.some((r) => r.priority === priority)) return priority;
  }
  return recommendations[0].priority;
}

function groupKey(rec: Recommendation): string | null {
  return rec.category ? `category:${rec.category}` : null;
}

export function groupRecommendations(
  recommendations: Recommendation[]
): RecommendationGroupEntry[] {
  const counts = new Map<string, number>();
  for (const rec of recommendations) {
    const key = groupKey(rec);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const seen = new Set<string>();
  const entries: RecommendationGroupEntry[] = [];
  for (const rec of recommendations) {
    const key = groupKey(rec);
    if (!key || (counts.get(key) ?? 0) < 2) {
      entries.push({ kind: "single", recommendation: rec });
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    const groupRecs = recommendations.filter((r) => groupKey(r) === key);
    entries.push({
      kind: "group",
      key,
      category: rec.category as string,
      priority: highestPriority(groupRecs),
      recommendations: groupRecs,
    });
  }
  return entries;
}
