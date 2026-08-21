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

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${TONE_STYLES[tone]}`}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className = "",
  tone,
}: {
  children: ReactNode;
  className?: string;
  tone?: Tone;
}) {
  const toneClass = tone
    ? TONE_STYLES[tone]
    : "bg-surface border-border text-foreground";
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${toneClass} ${className}`}>
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
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const variants: Record<string, string> = {
    primary: "bg-accent text-accent-foreground hover:opacity-90",
    secondary: "border border-border bg-surface text-foreground hover:bg-surface-muted",
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
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const variants: Record<string, string> = {
    primary: "bg-accent text-accent-foreground hover:opacity-90",
    secondary: "border border-border bg-surface text-foreground hover:bg-surface-muted",
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
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
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
    <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-foreground-muted">
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
