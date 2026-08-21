import Link from "next/link";
import type { ReactNode } from "react";

export type Tone =
  | "neutral"
  | "accent"
  | "danger"
  | "warning"
  | "surveillance"
  | "success"
  | "info";

const TONE_STYLES: Record<Tone, string> = {
  neutral: "bg-surface-muted border-border text-foreground",
  accent: "bg-accent-muted border-accent/30 text-accent",
  danger: "bg-danger-muted border-danger-border text-danger",
  warning: "bg-warning-muted border-warning-border text-warning",
  surveillance: "bg-surveillance-muted border-surveillance-border text-surveillance",
  success: "bg-success-muted border-success-border text-success",
  info: "bg-info-muted border-info-border text-info",
};

const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-foreground",
  accent: "text-accent",
  danger: "text-danger",
  warning: "text-warning",
  surveillance: "text-surveillance",
  success: "text-success",
  info: "text-info",
};

// Chip de statut (compteurs par sévérité, étiquettes de priorité, etc.) : le
// fond est dérivé de la couleur du texte elle-même plutôt qu'un ton fixe
// précalculé, pour rester lisible quel que soit le thème (skill/SKILL.md).
export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  const isNeutral = tone === "neutral";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_TEXT[tone]} ${
        isNeutral ? "border border-border bg-surface-muted" : ""
      }`}
      style={isNeutral ? undefined : { background: "color-mix(in srgb, currentColor 15%, transparent)" }}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className = "",
  style,
  tone,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  tone?: Tone;
  /** Survol vivant (élévation + léger agrandissement) — pour les cartes cliquables. */
  interactive?: boolean;
}) {
  const toneClass = tone
    ? TONE_STYLES[tone]
    : "bg-surface border-border text-foreground";
  return (
    <div
      style={style}
      className={`rounded-[20px] border p-4 shadow-sm transition-transform duration-200 ease-out ${
        interactive ? "hover:-translate-y-[3px] hover:scale-[1.02] hover:shadow-md" : ""
      } ${toneClass} ${className}`}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  className = "",
  disabled,
  onClick,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const variants: Record<string, string> = {
    primary: "bg-accent text-accent-foreground hover:bg-accent-strong",
    secondary: "border border-border bg-surface text-foreground hover:border-accent",
    ghost: "text-foreground-muted hover:text-foreground hover:bg-surface-muted",
  };
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = "secondary",
  size = "md",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const variants: Record<string, string> = {
    primary: "bg-accent text-accent-foreground hover:bg-accent-strong",
    secondary: "border border-border bg-surface text-foreground hover:border-accent",
    ghost: "text-foreground-muted hover:text-foreground hover:bg-surface-muted",
  };
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
  };

  return (
    <Link href={href} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </Link>
  );
}

export function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  const valueClass = tone ? TONE_TEXT[tone] : "text-foreground";
  return (
    <div className="rounded-[20px] border border-border bg-surface p-4 shadow-sm transition-transform duration-200 ease-out hover:-translate-y-[3px] hover:scale-[1.02] hover:shadow-md">
      <p className="text-xs text-foreground-muted">{label}</p>
      <p className={`mt-1 font-mono text-xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
      {children}
    </h2>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-dashed border-border p-6 text-center text-sm text-foreground-muted">
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-foreground-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
