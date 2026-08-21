"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getApiUrl } from "@/lib/api";

export type CreateCompanyState = {
  error?: string;
};

export async function createCompanyAction(
  _prevState: CreateCompanyState,
  formData: FormData
): Promise<CreateCompanyState> {
  const name = formData.get("name");
  const sector = formData.get("sector");
  const location = formData.get("location");
  const employeesRaw = formData.get("employees");
  const employees = employeesRaw ? Number(employeesRaw) : NaN;

  if (!name || !sector || !location || Number.isNaN(employees)) {
    return {
      error:
        "Veuillez remplir les champs obligatoires (nom, secteur, localisation, nombre d'employés).",
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

  const res = await fetch(`${getApiUrl()}/companies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return {
      error:
        typeof body?.detail === "string"
          ? body.detail
          : "Erreur lors de la création de l'entreprise.",
    };
  }

  revalidatePath("/entreprises");
  redirect("/entreprises");
}
