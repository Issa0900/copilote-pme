"""add profile column to imports

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-08-21 00:00:00.000000

Ajoute ``imports.profile`` pour distinguer le mappage générique du profil
« Ventes / POS » (colonnes de synonymes élargies, catégorie par défaut
« Ventes » quand aucune colonne catégorie n'est trouvée — voir
``app/ingestion.py::map_and_validate``). ``server_default`` pour que les
imports déjà en base restent valides sans backfill applicatif : ils sont
tous, par construction, passés par le mappage générique.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "imports",
        sa.Column(
            "profile",
            sa.String(length=20),
            nullable=False,
            server_default="generique",
        ),
    )


def downgrade() -> None:
    op.drop_column("imports", "profile")
