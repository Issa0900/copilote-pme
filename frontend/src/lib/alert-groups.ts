import type { Alert } from "@/lib/types";

// Regroupe les alertes d'un même niveau de sévérité qui se ressemblent trop
// pour justifier une carte chacune (ex. 20 alertes « dépense inhabituelle...
// Salaires » à des dates différentes) :
// - Alertes issues d'une anomalie avec une `category` : regroupées par
//   catégorie de transaction (Salaires, Ventes, Fournisseurs, ...).
// - Alertes sans catégorie (`category: null`, essentiellement les imports) :
//   regroupées sous « Imports » si plusieurs partagent cette origine.
// Un regroupement n'a de sens qu'à partir de 2 alertes ; en dessous, l'alerte
// reste affichée seule (pas d'accordéon pour un élément unique).
export type AlertGroupEntry =
  | { kind: "single"; alert: Alert }
  | { kind: "group"; key: string; label: string; alerts: Alert[] };

function groupKey(alert: Alert): string | null {
  if (alert.category) return `category:${alert.category}`;
  if (alert.source === "import") return "import";
  return null;
}

function groupLabel(alert: Alert): string {
  return alert.category ?? "Imports";
}

export function groupAlerts(alerts: Alert[]): AlertGroupEntry[] {
  const counts = new Map<string, number>();
  for (const alert of alerts) {
    const key = groupKey(alert);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const seen = new Set<string>();
  const entries: AlertGroupEntry[] = [];
  for (const alert of alerts) {
    const key = groupKey(alert);
    if (!key || (counts.get(key) ?? 0) < 2) {
      entries.push({ kind: "single", alert });
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({
      kind: "group",
      key,
      label: groupLabel(alert),
      alerts: alerts.filter((a) => groupKey(a) === key),
    });
  }
  return entries;
}

// Extrait un montant en dollars d'un message d'alerte en langage naturel
// (ex. « ... de 5897.60 $ a été détectée ... ») pour offrir un résumé de la
// fourchette de montants d'un groupe, sans dépendre d'un champ structuré que
// le backend n'expose pas encore pour ce montant.
function extractAmount(message: string): number | null {
  const match = message.match(/(-?\d+(?:\.\d+)?)\s*\$/);
  return match ? Number(match[1]) : null;
}

export function amountRange(alerts: Alert[]): { min: number; max: number } | null {
  const amounts = alerts.map((a) => extractAmount(a.message)).filter((n): n is number => n !== null);
  if (amounts.length === 0) return null;
  return { min: Math.min(...amounts), max: Math.max(...amounts) };
}
