"""add action estimated_impact

Revision ID: 899574f4c6e9
Revises: b4b400124ddc
Create Date: 2026-09-02 16:39:46.220933

Ajout naïf en NOT NULL sans défaut échouerait sur toute ligne `actions`
déjà en base (même motif que a1b2c3d4e5f6_backfill_recommendation_category) :
colonne ajoutée nullable, rétro-remplie depuis `Recommendation.impact` (la
source dont `estimated_impact` est une copie figée à la création, cf.
`app/actions.py::create_action_from_recommendation`), puis contrainte
NOT NULL appliquée.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '899574f4c6e9'
down_revision: Union[str, Sequence[str], None] = 'b4b400124ddc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('actions', sa.Column('estimated_impact', sa.Text(), nullable=True))
    op.execute(
        """
        UPDATE actions
        SET estimated_impact = r.impact
        FROM recommendations r
        WHERE r.id = actions.recommendation_id
        """
    )
    op.alter_column('actions', 'estimated_impact', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('actions', 'estimated_impact')
