// Jauge horizontale (skill/SKILL.md) : le seul composant de score du produit —
// jamais de jauge circulaire, quel que soit le score (santé globale,
// dimension, risque, opportunité, confiance). Remplissage en dégradé
// signal-fort → signal, animé à l'ouverture via .animate-bar-grow
// (globals.css), désactivé automatiquement sous prefers-reduced-motion.
import type { ReactNode } from "react";

import type { Tone } from "@/components/ui";

const TONE_GRADIENT: Partial<Record<Tone, string>> = {
  danger: "linear-gradient(to right, var(--danger), color-mix(in srgb, var(--danger) 70%, white))",
  warning: "linear-gradient(to right, var(--warning), color-mix(in srgb, var(--warning) 70%, white))",
  surveillance:
    "linear-gradient(to right, var(--surveillance), color-mix(in srgb, var(--surveillance) 70%, white))",
  success: "linear-gradient(to right, var(--success), color-mix(in srgb, var(--success) 70%, white))",
  info: "linear-gradient(to right, var(--info), color-mix(in srgb, var(--info) 70%, white))",
};

const DEFAULT_GRADIENT = "linear-gradient(to right, var(--accent), var(--accent-strong))";

// Graduations à 25/50/75 % — repères de lecture rapide, pas une échelle
// précise à interpoler (l'échelle réelle est donnée par la valeur chiffrée).
const TICKS = [25, 50, 75];

export function Gauge({
  label,
  value,
  max = 100,
  displayValue,
  tone,
  enterDelay = "0s",
}: {
  label: ReactNode;
  /** Valeur brute sur l'échelle [0, max]. */
  value: number;
  max?: number;
  /** Texte affiché à droite de la jauge (ex. "72 / 100", "68 %") — par
   * défaut, le pourcentage arrondi de value/max. */
  displayValue?: string;
  /** Teinte sémantique optionnelle (danger/warning/.../success) — sans elle,
   * la jauge utilise l'accent de marque (cas par défaut : score de santé). */
  tone?: Tone;
  enterDelay?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const gradient = (tone && TONE_GRADIENT[tone]) || DEFAULT_GRADIENT;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm text-foreground-muted">{label}</span>
        <span className="font-mono text-sm font-semibold text-foreground">
          {displayValue ?? `${Math.round(pct)}%`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        className="relative h-2.5 overflow-hidden rounded-full bg-surface-muted"
      >
        {/* Graduations : repères fixes, sous le remplissage. */}
        {TICKS.map((t) => (
          <span
            key={t}
            aria-hidden
            className="absolute top-0 h-full w-px bg-background/40"
            style={{ left: `${t}%` }}
          />
        ))}
        <span
          className="animate-bar-grow absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            background: gradient,
            "--enter-delay": enterDelay,
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
}
