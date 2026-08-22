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

  const payload = {
    name,
    sector,
    location,
    employees,
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
