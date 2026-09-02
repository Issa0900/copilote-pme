"""Journalisation des actions sensibles (spec section 64.25).

Le critere bloquant du MVP demande que « les actions importantes soient
journalisees ». Aucune trace applicative n'existait : une suppression d'import
(qui detruit des transactions en masse) ne laissait rien derriere elle.

Choix de conception : journalisation APPLICATIVE via `logging` de la stdlib,
pas de table `AuditLog` persistee. Une nouvelle entite de donnees releve d'un
arbitrage produit qui n'a pas ete rendu ; le journal applicatif couvre le
besoin d'investigation immediat (qui a fait quoi, quand) sans figer un modele.
Limite assumee : le journal vit avec le process (fichier/collecteur de logs),
il n'est ni requetable depuis l'API ni conserve par le SGBD.

Format retenu : logfmt (`cle=valeur` separes par des espaces) sur une seule
ligne. Lisible tel quel en developpement, et parsable sans ambiguite par un
collecteur en production (Render, Datadog, `grep action=import.delete`). Le
meme enregistrement est aussi attache a l'objet LogRecord sous l'attribut
`audit` (dictionnaire), pour qu'un handler JSON en production puisse emettre
la structure complete sans reparser le message.

Regles de contenu, volontairement strictes :
- JAMAIS de secret : pas de mot de passe (meme hache), pas de token JWT, pas
  d'en-tete Authorization.
- JAMAIS de contenu metier de transaction (montants, descriptions, libelles
  clients) : le journal sert a tracer une ACTION, pas a dupliquer les donnees.
- Donnee personnelle : seule l'adresse e-mail d'une tentative de connexion
  ECHOUEE est journalisee (cf. `log_login_failed`). C'est la seule facon
  d'identifier le compte vise lors d'une serie d'echecs — il n'y a par
  definition pas de user_id fiable dans ce cas. Les connexions reussies et les
  inscriptions ne journalisent que `user_id`/`company_id`.
- ASCII uniquement dans les messages : la console Windows du projet est en
  cp1252 et un caractere hors Latin-1 fait echouer l'ecriture.
"""

import logging
import uuid
from datetime import date, datetime, timezone
from typing import Any

# Logger dedie : permet de router/filtrer les evenements d'audit
# independamment du reste des logs applicatifs (`logging.getLogger("gescop.audit")`).
AUDIT_LOGGER_NAME = "gescop.audit"
logger = logging.getLogger(AUDIT_LOGGER_NAME)

# Format de log applicatif par defaut. `%(name)s` conserve le nom du logger,
# ce qui rend les lignes d'audit reperables meme melangees aux logs uvicorn.
LOG_FORMAT = "%(asctime)s %(levelname)s %(name)s %(message)s"


def configure_logging(level: str = "INFO") -> None:
    """Configure le logging applicatif de base (appele depuis app/main.py).

    `force=True` : uvicorn installe ses propres handlers sur le logger racine
    au demarrage ; sans cela, selon l'ordre d'import, les lignes d'audit
    peuvent etre emises deux fois ou pas du tout."""
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format=LOG_FORMAT,
        force=True,
    )


def _normalize(value: Any) -> Any:
    """Rend la valeur directement sérialisable (JSON) par un handler de
    production : les UUID et dates deviennent des chaînes, les entiers et
    booléens restent typés (un compteur doit rester agrégeable côté
    collecteur)."""
    if isinstance(value, (uuid.UUID, datetime, date)):
        return str(value)
    return value


def _format_value(value: Any) -> str:
    if value is None:
        return "-"
    text = str(value)
    if text == "":
        return '""'
    if any(char.isspace() for char in text) or '"' in text:
        escaped = text.replace('"', '\\"')
        return f'"{escaped}"'
    return text


def log_action(
    action: str,
    *,
    user_id: Any = None,
    company_id: Any = None,
    outcome: str = "success",
    **details: Any,
) -> None:
    """Journalise une action sensible.

    `action` suit la convention `domaine.verbe` (ex. `import.delete`).
    `details` porte les elements utiles au diagnostic (identifiants, compteurs)
    — jamais de secret ni de contenu metier, cf. docstring du module."""
    record: dict[str, Any] = {
        # Horodatage explicite en UTC ISO 8601, en plus de celui pose par le
        # formatter : un collecteur qui ne lit que la structure `audit` doit
        # pouvoir dater l'evenement sans dependre du format de la ligne.
        "ts": datetime.now(timezone.utc).isoformat(),
        "action": action,
        "outcome": outcome,
        "user_id": None if user_id is None else str(user_id),
        "company_id": None if company_id is None else str(company_id),
    }
    record.update({key: _normalize(value) for key, value in details.items()})

    message = " ".join(f"{key}={_format_value(value)}" for key, value in record.items())
    logger.info(message, extra={"audit": record})


# --- Raccourcis par domaine -------------------------------------------------
# Les routers appellent ces fonctions plutot que `log_action` directement :
# le nom de l'action et le jeu de champs restent ainsi definis a un seul
# endroit (et donc stables pour quiconque exploite le journal).


def log_login_success(user_id: Any, company_id: Any) -> None:
    log_action("auth.login", user_id=user_id, company_id=company_id)


def log_login_failed(email: str, reason: str) -> None:
    """DONNEE PERSONNELLE : l'e-mail vise est journalise ici, et seulement ici.
    Une serie d'echecs sans le compte cible n'est pas exploitable (on ne peut
    ni prevenir l'utilisateur, ni distinguer un brute-force cible d'un
    balayage). `reason` vaut "unknown_email" ou "bad_password" — cette
    distinction reste interne au journal, la reponse HTTP demeure generique
    pour ne pas permettre l'enumeration de comptes."""
    log_action("auth.login", outcome="failure", email=email, reason=reason)


def log_register(user_id: Any, company_id: Any) -> None:
    log_action("auth.register", user_id=user_id, company_id=company_id)


def log_import_created(
    user_id: Any,
    company_id: Any,
    import_id: Any,
    *,
    status: str,
    rows_processed: int,
    rows_quarantined: int,
    duplicates_skipped: int,
) -> None:
    log_action(
        "import.create",
        user_id=user_id,
        company_id=company_id,
        import_id=import_id,
        import_status=status,
        rows_processed=rows_processed,
        rows_quarantined=rows_quarantined,
        duplicates_skipped=duplicates_skipped,
    )


def log_import_deleted(
    user_id: Any, company_id: Any, import_id: Any, *, transactions_deleted: int
) -> None:
    """L'action la plus destructive de l'API : le nombre de transactions
    reellement supprimees est journalise, sans leur contenu."""
    log_action(
        "import.delete",
        user_id=user_id,
        company_id=company_id,
        import_id=import_id,
        transactions_deleted=transactions_deleted,
    )


def log_company_updated(user_id: Any, company_id: Any, *, fields: list[str]) -> None:
    """Seuls les NOMS des champs modifies sont journalises, pas leurs valeurs :
    savoir que `objectives`/`revenue_range` ont change suffit a expliquer un
    changement d'interpretation des KPI, sans recopier des donnees d'entreprise
    dans le journal."""
    log_action(
        "company.update",
        user_id=user_id,
        company_id=company_id,
        fields=",".join(fields) if fields else "-",
    )


def log_recommendation_status_changed(
    user_id: Any,
    company_id: Any,
    recommendation_id: Any,
    *,
    old_status: str,
    new_status: str,
) -> None:
    """Journalisee : accepter ou rejeter une recommandation est une decision de
    pilotage. Sans trace, on ne peut pas reconstituer pourquoi une alerte a
    disparu du tableau de bord."""
    log_action(
        "recommendation.status_change",
        user_id=user_id,
        company_id=company_id,
        recommendation_id=recommendation_id,
        old_status=old_status,
        new_status=new_status,
    )
