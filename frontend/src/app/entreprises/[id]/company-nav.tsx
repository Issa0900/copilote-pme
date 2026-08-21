"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Company } from "@/lib/types";

const TABS = [
  { href: "", label: "Tableau de bord" },
  { href: "/imports", label: "Import" },
  { href: "/alertes", label: "Alertes", countKey: "alerts" },
  { href: "/recommandations", label: "Recommandations", countKey: "recommendations" },
  { href: "/rapport", label: "Rapports" },
] as const;

export function CompanyNav({
  companyId,
  company,
  alertCount,
  recommendationCount,
}: {
  companyId: string;
  company: Company | null;
  alertCount: number;
  recommendationCount: number;
}) {
  const pathname = usePathname();
  const base = `/entreprises/${companyId}`;
  const counts: Record<string, number> = {
    alerts: alertCount,
    recommendations: recommendationCount,
  };

  return (
    <nav className="flex w-[236px] shrink-0 flex-col gap-8 rounded-r-[28px] bg-nav px-5 py-7 text-nav-text">
      <Link href={base} className="flex items-center gap-2.5 text-[15px] font-bold">
        <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-accent">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path
              d="M3 15L9 9L13 13L21 5"
              stroke="var(--nav-active-text)"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        Copilote PME
      </Link>

      <div className="flex flex-col gap-1">
        {TABS.map((tab) => {
          const href = `${base}${tab.href}`;
          const isActive =
            tab.href === "" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          const count = "countKey" in tab ? counts[tab.countKey] : undefined;
          return (
            <Link
              key={tab.href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center justify-between rounded-full px-3.5 py-2.5 text-[13.5px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                isActive
                  ? "bg-accent font-semibold text-nav-active-text"
                  : "text-nav-text-dim hover:translate-x-0.5 hover:bg-white/10 hover:text-nav-text"
              }`}
            >
              <span>{tab.label}</span>
              {count !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[11px] ${
                    isActive ? "bg-black/15 text-nav-active-text" : "bg-black/20"
                  }`}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {company && (
        <div className="mt-auto text-xs leading-relaxed text-nav-text-dim">
          {company.name}
          <br />
          {company.sector} · {company.location}
        </div>
      )}
    </nav>
  );
}
