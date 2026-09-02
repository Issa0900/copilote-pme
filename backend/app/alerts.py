"""Centre d'alertes (PRD Module 31).

Agrège, à la volée, les signaux déjà produits par les modules existants
(anomalies détectées, imports en échec ou partiellement en quarantaine) en
5 niveaux de sévérité définis par le PRD : critique, important, surveillance,
opportunite, information.

Aucune nouvelle entité persistée : le modèle de données minimal du PRD
(section 36) ne définit pas d'entité « Alert », et il n'y a pas encore de
Risk/Opportunity/Recommendation générés (Modules 16-19) pour alimenter les
niveaux opportunité/information. Ce sont donc les seules sources honnêtes
disponibles pour l'instant — pas d'état persistant (lu/résolu), pas de
canal de notification (Module 32, non implémenté).
"""

import uuid
from collections import Counter
from dataclasses import dataclass

from app.anomalies import Anomaly
from app.models import Import, Transaction

QUARANTINE_RATIO_IMPORTANT = 0.3

AlertLevel = str  # "critique" | "important" | "surveillance" | "opportunite" | "information"

ANOMALY_SEVERITY_TO_LEVEL: dict[str, AlertLevel] = {
    "high": "critique",
    "medium": "important",
    "low": "surveillance",
}


@dataclass
class Alert:
    level: AlertLevel
    title: str
    message: str
    source: str  # "anomaly" | "import"
    source_id: str | None = None
    category: str | None = None
    # Quoi/Pourquoi/Impact/Action (spec §51/§64.13) — remplis pour les alertes
    # venant d'une anomalie (`why`/`impact_amount`/`action` de l'`Anomaly`
    # source), `None` pour celles venant d'un import : un import échoué ou en
    # quarantaine n'a pas ce quadruplet, son `message` porte déjà tout le
    # raisonnement disponible.
    why: str | None = None
    impact_amount: float | None = None
    action: str | None = None


def alerts_from_anomalies(anomalies: list[Anomaly]) -> list[Alert]:
    titles = {
        "transaction_outlier": "Transaction inhabituelle",
        "category_trend": "Tendance inhabituelle",
        "margin_decline": "Marge en baisse",
    }
    return [
        Alert(
            level=ANOMALY_SEVERITY_TO_LEVEL[a.severity],
            title=titles.get(a.type, "Anomalie détectée"),
            message=a.message,
            source="anomaly",
            source_id=a.transaction_id,
            category=a.category,
            why=a.why,
            impact_amount=a.impact_amount,
            action=a.action,
        )
        for a in anomalies
    ]


def alerts_from_imports(
    imports: list[Import],
    quarantined_by_import: dict[uuid.UUID, list[Transaction]] | None = None,
) -> list[Alert]:
    """``quarantined_by_import`` : transactions en quarantaine de chaque import,
    indexées par ``import.id`` — optionnel pour ne pas casser un appelant qui
    n'a chargé que les imports. Sans elle, le message de quarantaine reste au
    seul compte (comportement historique) ; avec elle, il détaille les motifs
    (spec §64.13 : « une alerte indique clairement le problème »)."""
    quarantined_by_import = quarantined_by_import or {}
    alerts: list[Alert] = []
    for imp in imports:
        if imp.status == "echoue":
            alerts.append(
                Alert(
                    level="critique",
                    title="Import échoué",
                    message=f"L'import « {imp.file_name} » a échoué : "
                    f"{imp.error_message or 'raison inconnue'}.",
                    source="import",
                    source_id=str(imp.id),
                )
            )
            continue

        if imp.rows_quarantined > 0 and imp.rows_processed > 0:
            ratio = imp.rows_quarantined / imp.rows_processed
            level = "important" if ratio > QUARANTINE_RATIO_IMPORTANT else "surveillance"
            message = (
                f"{imp.rows_quarantined} ligne(s) sur {imp.rows_processed} de "
                f"l'import « {imp.file_name} » sont en attente de vérification et "
                f"exclues des KPI tant qu'elles ne sont pas validées."
            )
            quarantined = quarantined_by_import.get(imp.id, [])
            reason_counts = Counter(
                reason
                for t in quarantined
                for reason in (t.quarantine_reasons or [])
            )
            if reason_counts:
                # Tri par fréquence décroissante : le motif le plus courant en
                # premier, c'est celui qui vaut la peine d'être vérifié dans le
                # fichier source en priorité.
                breakdown = ", ".join(
                    f"{count} {reason}"
                    for reason, count in sorted(
                        reason_counts.items(), key=lambda kv: kv[1], reverse=True
                    )
                )
                message += f" Motifs : {breakdown}."
            alerts.append(
                Alert(
                    level=level,
                    title="Données à valider",
                    message=message,
                    source="import",
                    source_id=str(imp.id),
                )
            )
    return alerts


LEVEL_RANK = {
    "critique": 0,
    "important": 1,
    "surveillance": 2,
    "opportunite": 3,
    "information": 4,
}


def sort_alerts(alerts: list[Alert]) -> list[Alert]:
    return sorted(alerts, key=lambda a: LEVEL_RANK[a.level])


def summarize_alerts(alerts: list[Alert]) -> dict[AlertLevel, int]:
    """Compte les alertes par niveau, les 5 niveaux étant toujours présents
    (à 0 si aucune alerte de ce niveau), dans l'ordre de sévérité de LEVEL_RANK."""
    counts = {level: 0 for level in LEVEL_RANK}
    for alert in alerts:
        counts[alert.level] += 1
    return counts
