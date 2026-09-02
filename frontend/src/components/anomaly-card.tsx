// Carte de priorité : applique la règle « Quoi / Pourquoi / Impact / Action ».
//
// Le « pourquoi » décrit la méthode de détection, pas une cause métier : le
// système ne sait pas encore rattacher une hausse à un fournisseur ou à un
// produit (analyse causale = Module 6, non implémenté). Affirmer « 3
// fournisseurs expliquent 72 % de la hausse » sans cette donnée serait une
// hypothèse présentée comme un fait — exactement ce que le PRD interdit.
import { Badge, Card, TrustBadge, type Tone } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { Anomaly } from "@/lib/types";

const SEVERITY_LABELS: Record<Anomaly["severity"], string> = {
  high: "Élevée",
  medium: "Moyenne",
  low: "Faible",
};

const SEVERITY_TONE: Record<Anomaly["severity"], Tone> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="text-sm leading-snug">
      <span className="font-medium text-foreground">{label} — </span>
      <span className="opacity-90">{children}</span>
    </p>
  );
}

export function AnomalyCard({
  anomaly,
  currency = "CAD",
  enterDelay = "0s",
}: {
  anomaly: Anomaly;
  /** Devise de l'entreprise (`Company.currency`), pour le montant d'impact. */
  currency?: string;
  enterDelay?: string;
}) {
  const tone = SEVERITY_TONE[anomaly.severity];
  const impact = anomaly.impact_amount;

  return (
    <Card
      tone={tone}
      className="animate-enter"
      style={{ "--enter-delay": enterDelay } as React.CSSProperties}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge tone={tone}>{SEVERITY_LABELS[anomaly.severity]}</Badge>
        {anomaly.category && <Badge tone="neutral">{anomaly.category}</Badge>}
        <span className="ml-auto">
          <TrustBadge level="analyse" />
        </span>
      </div>

      <div className="space-y-1.5">
        <Line label="Quoi">{anomaly.message}</Line>
        {anomaly.why && <Line label="Pourquoi">{anomaly.why}</Line>}
        {impact !== null && impact !== 0 && (
          <Line label="Impact">
            <span
              className={`font-mono font-medium ${impact > 0 ? "text-danger" : "text-success"}`}
            >
              {impact > 0 ? "+" : ""}
              {formatCurrency(impact, currency)}
            </span>{" "}
            par rapport au comportement habituel de cette catégorie
          </Line>
        )}
        {anomaly.action && <Line label="Action">{anomaly.action}</Line>}
      </div>
    </Card>
  );
}
