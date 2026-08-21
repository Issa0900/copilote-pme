"use server";

import { revalidatePath } from "next/cache";

import { apiFetch } from "@/lib/api";

export type UploadImportState = {
  error?: string;
  success?: string;
};

export async function uploadImportAction(
  companyId: string,
  _prevState: UploadImportState,
  formData: FormData
): Promise<UploadImportState> {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Veuillez choisir un fichier à importer." };
  }

  const upstreamForm = new FormData();
  upstreamForm.set("file", file, file.name);

  const res = await apiFetch(`/companies/${companyId}/imports`, {
    method: "POST",
    body: upstreamForm,
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    return {
      error:
        typeof body?.detail === "string"
          ? body.detail
          : "Erreur lors de l'import du fichier.",
    };
  }

  if (!body) {
    return { error: "Réponse invalide du serveur lors de l'import." };
  }

  revalidatePath(`/entreprises/${companyId}/imports`);

  if (body.status === "echoue") {
    return { error: body.error_message ?? "L'import a échoué." };
  }

  return {
    success: `Import terminé : ${body.rows_processed} ligne(s) traitée(s), score de qualité ${body.quality_score}%.`,
  };
}
