"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "", label: "Quotidien" },
  { href: "/hebdomadaire", label: "Hebdomadaire" },
  { href: "/mensuel", label: "Mensuel" },
];

export function ReportTabs({ companyId }: { companyId: string }) {
  const pathname = usePathname();
  const base = `/entreprises/${companyId}/rapport`;

  return (
    <nav className="mb-6 flex gap-1.5">
      {TABS.map((tab) => {
        const href = `${base}${tab.href}`;
        const isActive = pathname === href;
        return (
          <Link
            key={tab.href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isActive
                ? "bg-accent-muted text-accent"
                : "text-foreground-muted hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
