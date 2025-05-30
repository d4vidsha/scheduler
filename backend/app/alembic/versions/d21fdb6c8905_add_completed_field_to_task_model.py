"""Add completed field to Task model

Revision ID: d21fdb6c8905
Revises: ba1bdfec52c5
Create Date: 2025-05-28 21:16:03.730784

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'd21fdb6c8905'
down_revision = 'ba1bdfec52c5'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('task', sa.Column('completed', sa.Boolean(), nullable=False, server_default='false'))
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('task', 'completed')
    # ### end Alembic commands ###
