"use server";

import { redirect } from "next/navigation";

import { getApiUrl } from "@/lib/api";
import { clearSessionToken, setSessionToken } from "@/lib/auth";
import type { Company } from "@/lib/types";

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (!email || !password) {
    return { error: "Veuillez renseigner votre courriel et votre mot de passe." };
  }

  const res = await fetch(`${getApiUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return {
      error:
        typeof body?.detail === "string"
          ? body.detail
          : "Erreur lors de la connexion.",
    };
  }

  const { access_token: accessToken } = await res.json();
  await setSessionToken(accessToken);

  const meRes = await fetch(`${getApiUrl()}/companies/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const company: Company | null = meRes.ok ? await meRes.json() : null;

  redirect(company ? `/entreprises/${company.id}` : "/entreprises/nouvelle");
}

export async function logoutAction(): Promise<void> {
  await clearSessionToken();
  redirect("/connexion");
}
