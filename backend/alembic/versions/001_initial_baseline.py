"""Initial Baseline Migration for Neighbr Modular Monolith

Revision ID: 001_initial_baseline
Revises: 
Create Date: 2026-08-19 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial_baseline'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Users & Devices
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('phone', sa.String(20), nullable=False, unique=True, index=True),
        sa.Column('full_name', sa.String(100), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('is_platform_admin', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    op.create_table(
        'user_devices',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('device_id', sa.String(100), nullable=False),
        sa.Column('device_name', sa.String(100), nullable=True),
        sa.Column('platform', sa.String(20), nullable=False),
        sa.Column('push_token', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # 2. Societies & Buildings & Units
    op.create_table(
        'societies',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(150), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('address_line1', sa.String(255), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('state', sa.String(100), nullable=True),
        sa.Column('pincode', sa.String(20), nullable=True),
        sa.Column('total_units', sa.Integer(), nullable=False, default=0),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    op.create_table(
        'buildings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('society_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('societies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('total_floors', sa.Integer(), nullable=False, default=1),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
    )

    op.create_table(
        'units',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('society_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('societies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('building_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('buildings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('unit_number', sa.String(50), nullable=False),
        sa.Column('floor_number', sa.Integer(), nullable=False, default=1),
        sa.Column('status', sa.String(20), nullable=False, default='OCCUPIED'),
    )

    op.create_table(
        'unit_memberships',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('unit_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('units.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(50), nullable=False, default='resident'),
        sa.Column('membership_type', sa.String(50), nullable=False, default='owner'),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
    )

    # 3. Gates & Guards
    op.create_table(
        'gates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('society_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('societies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('gate_type', sa.String(50), nullable=False, default='MAIN'),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
    )

    op.create_table(
        'guard_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('society_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('societies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('badge_number', sa.String(50), nullable=True),
        sa.Column('shift_status', sa.String(20), nullable=False, default='OFF_DUTY'),
    )

    # 4. Visitors & Passes & Events
    op.create_table(
        'visitor_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('society_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('societies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('phone', sa.String(20), nullable=True, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    op.create_table(
        'visitor_passes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('society_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('societies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('unit_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('units.id', ondelete='CASCADE'), nullable=False),
        sa.Column('pass_code', sa.String(50), nullable=False, unique=True, index=True),
        sa.Column('visitor_name', sa.String(100), nullable=False),
        sa.Column('visitor_phone', sa.String(20), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, default='PENDING'),
        sa.Column('valid_from', sa.DateTime(timezone=True), nullable=False),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    op.create_table(
        'visitor_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('society_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('societies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('pass_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('visitor_passes.id', ondelete='SET NULL'), nullable=True),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # 5. Helpdesk
    op.create_table(
        'helpdesk_tickets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('society_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('societies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('unit_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('units.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(150), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('priority', sa.String(20), nullable=False, default='normal'),
        sa.Column('status', sa.String(20), nullable=False, default='OPEN'),
        sa.Column('sla_due_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # 6. Amenities
    op.create_table(
        'amenities',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('society_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('societies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('capacity_per_slot', sa.Integer(), nullable=False, default=4),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
    )

    op.create_table(
        'amenity_bookings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('society_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('societies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('amenity_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('amenities.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('booking_date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.String(20), nullable=False),
        sa.Column('end_time', sa.String(20), nullable=False),
        sa.Column('qr_pass', sa.String(50), nullable=False, unique=True),
        sa.Column('status', sa.String(20), nullable=False, default='CONFIRMED'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # 7. Billing & Invoices
    op.create_table(
        'invoices',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('society_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('societies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('unit_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('units.id', ondelete='CASCADE'), nullable=False),
        sa.Column('invoice_number', sa.String(50), nullable=False, unique=True),
        sa.Column('billing_period', sa.String(50), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('total_amount', sa.Float(), nullable=False),
        sa.Column('paid_amount', sa.Float(), nullable=False, default=0.0),
        sa.Column('status', sa.String(20), nullable=False, default='UNPAID'),
        sa.Column('line_items', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default=[]),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # 8. Community
    op.create_table(
        'community_posts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('society_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('societies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('author_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('category', sa.String(50), nullable=False, default='general'),
        sa.Column('likes_count', sa.Integer(), nullable=False, default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # 9. Marketplace
    op.create_table(
        'marketplace_listings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('society_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('societies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('seller_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(150), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('price', sa.Float(), nullable=False, default=0.0),
        sa.Column('status', sa.String(20), nullable=False, default='ACTIVE'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # 10. IoT & Automations
    op.create_table(
        'iot_devices',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('society_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('societies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('device_type', sa.String(50), nullable=False),
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, default='ONLINE'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    op.create_table(
        'automation_rules',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('society_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('societies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(150), nullable=False),
        sa.Column('trigger_event', sa.String(50), nullable=False),
        sa.Column('action_type', sa.String(50), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )


def downgrade() -> None:
    op.drop_table('automation_rules')
    op.drop_table('iot_devices')
    op.drop_table('marketplace_listings')
    op.drop_table('community_posts')
    op.drop_table('invoices')
    op.drop_table('amenity_bookings')
    op.drop_table('amenities')
    op.drop_table('helpdesk_tickets')
    op.drop_table('visitor_events')
    op.drop_table('visitor_passes')
    op.drop_table('visitor_profiles')
    op.drop_table('guard_profiles')
    op.drop_table('gates')
    op.drop_table('unit_memberships')
    op.drop_table('units')
    op.drop_table('buildings')
    op.drop_table('societies')
    op.drop_table('user_devices')
    op.drop_table('users')
