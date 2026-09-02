"use server";

import { revalidatePath } from "next/cache";

import { apiFetch } from "@/lib/api";

export type UpdateCompanyState = {
  error?: string;
  success?: string;
};

export async function updateCompanyAction(
  companyId: string,
  _prevState: UpdateCompanyState,
  formData: FormData
): Promise<UpdateCompanyState> {
  const name = formData.get("name");
  const sector = formData.get("sector");
  const location = formData.get("location");
  const employeesRaw = formData.get("employees");
  const employees = employeesRaw ? Number(employeesRaw) : NaN;

  if (!name || !sector || !location || Number.isNaN(employees)) {
    return {
      error: "Veuillez remplir les champs obligatoires (nom, secteur, localisation, nombre d'employés).",
    };
  }

  // Champs numériques optionnels : un champ laissé vide doit rester `null`
  // (« pas d'objectif fixé »), surtout pas 0 — un objectif de 0 $ afficherait
  // un « 100 % atteint » trompeur au tableau de bord.
  const optionalNumber = (key: string): number | null => {
    const raw = formData.get(key);
    if (raw === null || String(raw).trim() === "") return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  };

  // `target_margin_pct` et `health_healthy_threshold` ne sont pas nullables en
  // base (ils ont toujours une valeur par défaut) : on ne les transmet que
  // renseignés, sinon le PATCH tenterait de les effacer. À l'inverse,
  // `revenue_target`/`expense_budget` sont bien optionnels — y envoyer `null`
  // est la façon d'effacer un objectif.
  const targetMargin = optionalNumber("target_margin_pct");
  const healthyThreshold = optionalNumber("health_healthy_threshold");

  const payload = {
    name,
    sector,
    location,
    employees,
    ...(targetMargin !== null ? { target_margin_pct: targetMargin } : {}),
    ...(healthyThreshold !== null ? { health_healthy_threshold: healthyThreshold } : {}),
    revenue_target: optionalNumber("revenue_target"),
    expense_budget: optionalNumber("expense_budget"),
    business_model: formData.get("business_model") || null,
    products: formData.get("products") || null,
    services: formData.get("services") || null,
    customers: formData.get("customers") || null,
    suppliers: formData.get("suppliers") || null,
    revenue_range: formData.get("revenue_range") || null,
    tools_used: formData.get("tools_used") || null,
    objectives: formData.getAll("objectives"),
  };

  const res = await apiFetch(`/companies/${companyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return {
      error:
        typeof body?.detail === "string"
          ? body.detail
          : "Erreur lors de la mise à jour de l'entreprise.",
    };
  }

  revalidatePath(`/entreprises/${companyId}`, "layout");

  return { success: "Modifications enregistrées." };
}
