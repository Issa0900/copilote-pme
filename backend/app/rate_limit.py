"""Rate limiting (slowapi / limits) — correctif VULN-005.

Instance partagée du Limiter, importée par app/main.py (enregistrement de
l'exception handler) et par les routers qui exposent des endpoints publics
non authentifiés (actuellement /auth/register et /auth/login, les seuls
points d'entrée de l'API qui ne passent pas par require_company_access).

Limitation par adresse IP uniquement (get_remote_address), en mémoire
(storage par défaut de slowapi) — pas de Redis dans le projet à ce jour.
Voir le commentaire au-dessus de chaque décorateur @limiter.limit(...) dans
app/routers/auth.py pour le choix des seuils, et le message de commit du
correctif pour la discussion sur le throttling par email (écarté pour ce
correctif, IP uniquement)."""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
