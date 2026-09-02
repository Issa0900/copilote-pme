import type { Tone } from "@/components/ui";
import type { ActionStatus } from "@/lib/types";

// Correspondance statut d'action -> libellé et ton de badge (spec §31).
export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  bloquee: "Bloquée",
  terminee: "Terminée",
  annulee: "Annulée",
};

export const ACTION_STATUS_TONE: Record<ActionStatus, Tone> = {
  a_faire: "neutral",
  en_cours: "info",
  bloquee: "warning",
  terminee: "success",
  annulee: "neutral",
};

export const ACTION_STATUS_ORDER: ActionStatus[] = [
  "a_faire",
  "en_cours",
  "bloquee",
  "terminee",
  "annulee",
];
