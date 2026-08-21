import Link from "next/link";

import { getApiUrl } from "@/lib/api";
import type { Company } from "@/lib/types";
import { CompanyNav } from "./company-nav";

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await fetch(`${getApiUrl()}/companies/${id}`, { cache: "no-store" });
  const company: Company | null = res.ok ? await res.json() : null;

  return (
    <main className="mx-auto w-full max-w-3xl p-6 sm:p-8">
      <Link
        href="/entreprises"
        className="mb-4 inline-block text-sm text-foreground-muted hover:text-foreground"
      >
        ← Mes entreprises
      </Link>

      {company && (
        <div className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            {company.sector} · {company.location}
          </p>
        </div>
      )}

      <CompanyNav companyId={id} />

      {children}
    </main>
  );
}
