"use server";

import { redirect } from "next/navigation";

import { getApiUrl } from "@/lib/api";
import { setSessionToken } from "@/lib/auth";
import type { Company } from "@/lib/types";

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
  const email = formData.get("email");
  const password = formData.get("password");

  if (
    !name ||
    !sector ||
    !location ||
    Number.isNaN(employees) ||
    !email ||
    !password
  ) {
    return {
      error:
        "Veuillez remplir les champs obligatoires (nom, secteur, localisation, nombre d'employés, courriel, mot de passe).",
    };
  }

  if (typeof password === "string" && password.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
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
    // "CAD" si le sélecteur n'a pas pu être rempli (échec de
    // /meta/company-options) : jamais une chaîne vide, que le backend
    // rejetterait puisque `currency` n'accepte pas `null`/"".
    currency: formData.get("currency") || "CAD",
    email,
    password,
  };

  const res = await fetch(`${getApiUrl()}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
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

  const { access_token: accessToken } = await res.json();
  await setSessionToken(accessToken);

  const meRes = await fetch(`${getApiUrl()}/companies/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const company: Company | null = meRes.ok ? await meRes.json() : null;

  if (!company) {
    return {
      error:
        "Compte créé, mais impossible de charger le tableau de bord. Réessayez de vous connecter.",
    };
  }

  redirect(`/entreprises/${company.id}`);
}
