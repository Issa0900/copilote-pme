import { redirect } from "next/navigation";

import { apiFetch } from "@/lib/api";
import type { Company } from "@/lib/types";

// A logged-in user has exactly one company (their own, via /companies/me —
// GET /companies, which used to list every tenant's companies, no longer
// exists). This route has no UI of its own anymore: it just resolves the
// current user's company and sends them straight to its dashboard.
// (apiFetch already redirects to /connexion if there's no/expired session.)
export default async function EntreprisesPage() {
  const res = await apiFetch("/companies/me");
  const company: Company | null = res.ok ? await res.json() : null;

  if (!company) {
    redirect("/connexion");
  }

  redirect(`/entreprises/${company.id}`);
}
