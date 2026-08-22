import Link from "next/link";

const PRESETS = [
  { value: "7j", label: "7 jours" },
  { value: "30j", label: "30 jours" },
  { value: "90j", label: "90 jours" },
  { value: "", label: "Tout" },
] as const;

// Composant serveur (pas de "use client") : l'onglet actif vient directement
// de la prop `active`, déjà lue par page.tsx depuis searchParams — pas
// besoin d'un hook client comme rapport/report-tabs.tsx qui, lui, navigue
// entre routes distinctes plutôt qu'un paramètre de requête.
export function PeriodFilter({ active }: { active: string }) {
  return (
    <nav className="flex gap-1.5">
      {PRESETS.map((preset) => {
        const isActive = preset.value === active;
        return (
          <Link
            key={preset.value}
            href={preset.value ? `?range=${preset.value}` : "?"}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-11 min-w-11 items-center whitespace-nowrap rounded-full px-3.5 py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              isActive
                ? "bg-accent-muted text-accent"
                : "text-foreground-muted hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            {preset.label}
          </Link>
        );
      })}
    </nav>
  );
}
