"""backfill recommendation category from source_key

Revision ID: a1b2c3d4e5f6
Revises: 97e042b43850
Create Date: 2026-08-21 00:00:00.000000

La migration précédente (97e042b43850) a ajouté la colonne ``category``
sans rétro-remplir les lignes existantes, qui restent donc à NULL
indéfiniment (constaté sur un compte de test réel : 34/34 recommandations
avec ``category IS NULL``, ce qui empêche tout regroupement par catégorie
côté frontend). ``source_key`` encode déjà la catégorie comme son 2e
segment (``{type}:{category}:{transaction_id_ou_periode}`` — voir
``app/recommendations.py::_source_key``), donc le backfill se fait par
simple extraction, sans recalcul des anomalies sources.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "97e042b43850"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE recommendations
        SET category = NULLIF(split_part(source_key, ':', 2), '')
        WHERE category IS NULL
        """
    )


def downgrade() -> None:
    # Irréversible par nature (on ne peut pas distinguer un NULL d'origine
    # d'un NULL restauré) : pas de retour arrière significatif à fournir.
    pass
