import type { Tone } from "@/components/ui";
import type { AlertLevel } from "@/lib/types";

// Correspondance niveau d'alerte -> libellé et ton de badge, partagée entre
// le centre d'alertes et le tableau de bord entreprise pour éviter que les
// deux vues divergent silencieusement.
export const ALERT_LEVEL_LABELS: Record<AlertLevel, string> = {
  critique: "Critique",
  important: "Important",
  surveillance: "Surveillance",
  opportunite: "Opportunité",
  information: "Information",
};

export const ALERT_LEVEL_TONE: Record<AlertLevel, Tone> = {
  critique: "danger",
  important: "warning",
  surveillance: "surveillance",
  opportunite: "success",
  information: "info",
};

export const ALERT_LEVEL_ORDER: AlertLevel[] = [
  "critique",
  "important",
  "surveillance",
  "opportunite",
  "information",
];
