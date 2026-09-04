"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { apiFetch } from "@/lib/api";
import type { RecommendationStatus } from "@/lib/types";

export type SetRecommendationStatusState = {
  error?: string;
};

export async function setRecommendationStatusAction(
  companyId: string,
  recommendationId: string,
  status: RecommendationStatus,
  _prevState: SetRecommendationStatusState
): Promise<SetRecommendationStatusState> {
  const res = await apiFetch(
    `/companies/${companyId}/recommendations/${recommendationId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return {
      error:
        typeof body?.detail === "string"
          ? body.detail
          : "Erreur lors de la mise à jour de la recommandation.",
    };
  }

  revalidatePath(`/entreprises/${companyId}/recommandations`);
  // Le cockpit décisionnel affiche les mêmes recommandations en attente
  // d'arbitrage et propose les mêmes boutons : sans cette revalidation, une
  // recommandation arbitrée depuis le cockpit y resterait affichée comme
  // « en attente ».
  revalidatePath(`/entreprises/${companyId}/cockpit`);

  return {};
}

export type CreateActionState = {
  error?: string;
};

export async function createActionFromRecommendationAction(
  companyId: string,
  recommendationId: string,
  _prevState: CreateActionState,
  _formData: FormData
): Promise<CreateActionState> {
  const res = await apiFetch(`/companies/${companyId}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recommendation_id: recommendationId }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return {
      error:
        typeof body?.detail === "string"
          ? body.detail
          : "Erreur lors de la création de l'action.",
    };
  }

  // Redirection plutôt qu'un simple revalidatePath sur place : l'utilisateur
  // doit voir où l'action a atterri, pas rester sur un écran Recommandations
  // qui vient de faire disparaître les boutons Accepter/Rejeter/Créer une
  // action sans dire ce qui s'est passé.
  redirect(`/entreprises/${companyId}/actions`);
}
