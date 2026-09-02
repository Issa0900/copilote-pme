"use server";

import { revalidatePath } from "next/cache";

import { apiFetch } from "@/lib/api";

export type UpdateActionState = {
  error?: string;
};

export async function updateActionStatusAction(
  companyId: string,
  actionId: string,
  _prevState: UpdateActionState,
  formData: FormData
): Promise<UpdateActionState> {
  const status = formData.get("status");

  const res = await apiFetch(`/companies/${companyId}/actions/${actionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return {
      error:
        typeof body?.detail === "string"
          ? body.detail
          : "Erreur lors de la mise à jour de l'action.",
    };
  }

  revalidatePath(`/entreprises/${companyId}/actions`);
  return {};
}
