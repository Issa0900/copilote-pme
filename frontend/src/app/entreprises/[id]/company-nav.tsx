"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "", label: "Tableau de bord" },
  { href: "/imports", label: "Import" },
  { href: "/alertes", label: "Alertes" },
  { href: "/recommandations", label: "Recommandations" },
  { href: "/rapport", label: "Rapports" },
];

export function CompanyNav({ companyId }: { companyId: string }) {
  const pathname = usePathname();
  const base = `/entreprises/${companyId}`;

  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
      {TABS.map((tab) => {
        const href = `${base}${tab.href}`;
        const isActive =
          tab.href === "" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={tab.href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`whitespace-nowrap rounded-t-md border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isActive
                ? "border-accent text-accent"
                : "border-transparent text-foreground-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
