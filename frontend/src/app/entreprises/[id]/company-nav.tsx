"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  AlertIcon,
  CloseIcon,
  HomeIcon,
  ImportIcon,
  MenuIcon,
  RecommendationIcon,
  ReportIcon,
  SettingsIcon,
} from "@/components/icons";
import type { Company } from "@/lib/types";

// Navigation groupée par nature d'usage plutôt qu'en liste plate : le
// dirigeant distingue d'un coup d'œil « ce que le système a compris »
// (Intelligence) de « ce que je lui ai donné » (Données).
//
// Seules les destinations qui existent réellement figurent ici. Les rubriques
// annoncées à la feuille de route mais sans écran ni donnée (Performance,
// Marketing, RH, Prévisions, Simulations, Permissions...) ne sont volontairement
// pas listées : un onglet mort donnerait une fausse impression d'avancement.
const NAV_SECTIONS = [
  {
    title: null,
    items: [{ href: "", label: "Tableau de bord", Icon: HomeIcon }],
  },
  {
    title: "Intelligence",
    items: [
      { href: "/alertes", label: "Alertes", countKey: "alerts", Icon: AlertIcon },
      {
        href: "/recommandations",
        label: "Recommandations",
        countKey: "recommendations",
        Icon: RecommendationIcon,
      },
    ],
  },
  {
    title: "Données",
    items: [{ href: "/imports", label: "Importations", Icon: ImportIcon }],
  },
  {
    title: "Rapports",
    items: [{ href: "/rapport", label: "Rapports", Icon: ReportIcon }],
  },
  {
    title: "Administration",
    items: [{ href: "/parametres", label: "Paramètres", Icon: SettingsIcon }],
  },
] as const;

function Logo({ base }: { base: string }) {
  return (
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
      Gescop
    </Link>
  );
}

function NavLinks({
  base,
  pathname,
  counts,
}: {
  base: string;
  pathname: string | null;
  counts: Record<string, number | null>;
}) {
  return (
    <div className="flex flex-col gap-5">
      {NAV_SECTIONS.map((section, sectionIndex) => (
        <div key={section.title ?? `section-${sectionIndex}`} className="flex flex-col gap-1">
          {section.title && (
            <p className="mb-1 px-3.5 text-[10.5px] font-semibold uppercase tracking-wider text-nav-text-dim/70">
              {section.title}
            </p>
          )}
          {section.items.map((tab) => {
            const href = `${base}${tab.href}`;
            const isActive =
              tab.href === ""
                ? pathname === href
                : pathname === href || pathname?.startsWith(`${href}/`);
            const count = "countKey" in tab ? counts[tab.countKey] : undefined;
            return (
              <Link
                key={tab.href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center justify-between rounded-lg px-3.5 py-2.5 text-[13.5px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nav-text focus-visible:ring-offset-2 focus-visible:ring-offset-nav ${
                  isActive
                    ? "bg-accent font-semibold text-nav-active-text"
                    : "text-nav-text-dim hover:translate-x-0.5 hover:bg-white/10 hover:text-nav-text"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <tab.Icon className="h-[18px] w-[18px] shrink-0" />
                  {tab.label}
                </span>
                {/* `null` = compteur non chargé : le badge disparaît, plutôt
                    que d'afficher un 0 qui affirmerait à tort « rien à
                    traiter ». `0` réel ne s'affiche pas non plus. */}
                {count != null && count > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-[11px] ${
                      isActive ? "bg-black/15 text-nav-active-text" : "bg-black/25"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function CompanyCard({ company }: { company: Company | null }) {
  if (!company) return null;
  return (
    <div className="rounded-2xl bg-white/5 px-3.5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-nav-text-dim">
        Entreprise
      </p>
      <p className="mt-0.5 truncate text-[15px] font-semibold text-nav-text">{company.name}</p>
      <p className="mt-0.5 truncate text-xs text-nav-text-dim">
        {company.sector} · {company.location}
      </p>
    </div>
  );
}

export function CompanyNav({
  companyId,
  company,
  alertCount,
  recommendationCount,
}: {
  companyId: string;
  company: Company | null;
  // `null` (et non 0) quand le compteur n'a pas pu être chargé.
  alertCount: number | null;
  recommendationCount: number | null;
}) {
  const pathname = usePathname();
  const base = `/entreprises/${companyId}`;
  const counts: Record<string, number | null> = {
    alerts: alertCount,
    recommendations: recommendationCount,
  };
  const [open, setOpen] = useState(false);

  // Ferme le tiroir mobile automatiquement à chaque changement de page —
  // sans ça, naviguer depuis le tiroir laisserait l'overlay ouvert
  // par-dessus le nouvel écran.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Barre mobile : rail vertical remplacé par une barre horizontale +
          menu hamburger sous le point de rupture lg (~1024px) — le rail à
          largeur fixe (236px) n'a jamais eu de repli pour petit écran. */}
      <div className="flex items-center justify-between bg-nav px-4 py-3 text-nav-text lg:hidden">
        <Logo base={base} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nav-text"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Rail desktop, inchangé au-delà de lg */}
      <nav className="hidden w-[236px] shrink-0 flex-col gap-8 rounded-r-[28px] bg-nav px-5 py-7 text-nav-text lg:flex">
        <Logo base={base} />
        <CompanyCard company={company} />
        <NavLinks base={base} pathname={pathname} counts={counts} />
      </nav>

      {/* Tiroir mobile en overlay, même contenu que le rail desktop */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <nav className="absolute left-0 top-0 flex h-full w-[280px] flex-col gap-8 overflow-y-auto bg-nav px-5 py-7 text-nav-text">
            <div className="flex items-center justify-between">
              <Logo base={base} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nav-text"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <CompanyCard company={company} />
            <NavLinks base={base} pathname={pathname} counts={counts} />
          </nav>
        </div>
      )}
    </>
  );
}
