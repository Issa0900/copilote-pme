"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Header global "Gescop". Masqué sur les routes d'une entreprise
// connectée (/entreprises/[id]/**) : ces routes affichent leur propre rail
// de navigation vertical avec la marque déjà intégrée, et un header par-dessus
// ferait doublon. Reste inchangé sur toutes les autres routes (accueil,
// connexion, /entreprises/nouvelle) — voir skill/SKILL.md.
export function SiteHeader() {
  const pathname = usePathname();
  const isCompanyWorkspace = /^\/entreprises\/(?!nouvelle(?:\/|$))[^/]+/.test(pathname ?? "");

  if (isCompanyWorkspace) {
    return null;
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center px-6 py-3 sm:px-8">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Gescop
        </Link>
      </div>
    </header>
  );
}
