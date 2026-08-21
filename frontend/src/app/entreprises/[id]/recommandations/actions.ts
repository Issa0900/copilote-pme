"use server";

import { revalidatePath } from "next/cache";

import { getApiUrl } from "@/lib/api";
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
  const res = await fetch(
    `${getApiUrl()}/companies/${companyId}/recommendations/${recommendationId}`,
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

  return {};
}
