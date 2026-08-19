# Backend + Database + API Implementation Specification

## 1. Backend architecture

Use a modular monolith.

Stack: - Python 3.x - FastAPI - SQLAlchemy 2.x - Pydantic - Alembic -
PostgreSQL - Redis - background workers - WebSockets - S3-compatible
storage

No microservices initially.

## 2. Module boundaries

backend/app/modules/

-   auth
-   users
-   societies
-   buildings
-   units
-   memberships
-   residents
-   family
-   vehicles
-   gates
-   guards
-   visitors
-   visitor_passes
-   visitor_events
-   staff
-   vendors
-   notifications
-   audit
-   devices
-   permissions

Future: - billing - accounting - payments - helpdesk - amenities -
community - marketplace - services - documents - automation - IoT -
analytics - property

## 3. Every module structure

Example:

modules/visitors/ - router.py - service.py - repository.py - models.py -
schemas.py - permissions.py - events.py - tests/

Rules: - routers handle HTTP only - services contain business logic -
repositories handle persistence - schemas define API contracts - events
define domain events - permissions are explicit - tests sit with modules

## 4. Core database entities

### Identity

users user_devices sessions roles permissions role_permissions

### Society

societies society_settings buildings floors units unit_memberships

### People

resident_profiles family_members staff staff_assignments vendors

### Security

gates guard_profiles guard_devices visitor_profiles visitor_passes
visitor_events vehicle_profiles blacklists watchlists

### Communication

notifications notification_deliveries notices

### Audit

audit_events

### Future

tickets ticket_comments amenities amenity_slots amenity_bookings
invoices invoice_items payments ledger_entries posts comments
marketplace_listings service_providers service_requests documents
devices device_events automation_rules

## 5. Multi-tenancy

Every society-owned entity must be traceable to society_id.

Never trust society_id from a client request.

Derive the permitted society scope from authenticated membership/role.

All queries must enforce tenancy.

Add database indexes beginning with: - society_id - unit_id - user_id -
status - created_at - gate_id - visitor_id

Use composite indexes based on real query patterns.

## 6. Membership model

Do not put a single global role on users.

A user can have different roles per society.

Concept:

user → society_membership → society → unit(s) → role(s)

This allows: - owner in Society A - committee member in Society B -
staff in Society C

## 7. Event model

Create an append-oriented audit/event table.

Fields: - id UUID - society_id - actor_user_id nullable - device_id
nullable - event_type - entity_type - entity_id - payload JSONB -
occurred_at - received_at - source - correlation_id - idempotency_key

Examples: - VISITOR_CREATED - VISITOR_APPROVAL_REQUESTED -
VISITOR_APPROVED - VISITOR_REJECTED - VISITOR_CHECKED_IN -
VISITOR_CHECKED_OUT - GUARD_CHECKED_IN - GUARD_CHECKED_OUT -
GATE_OPENED - GATE_CLOSED - DEVICE_OFFLINE - DEVICE_ONLINE

## 8. Visitor state machine

States:

CREATED → INVITED → APPROVAL_PENDING → APPROVED → ARRIVED → CHECKED_IN →
CHECKED_OUT → EXPIRED → CANCELLED → REJECTED

Not every visitor uses every state.

State transitions must be validated server-side.

## 9. Pass model

Pass types: - guest - delivery - cab - service - staff - vehicle -
material - recurring

Pass fields should include: - issuer - society - unit - visitor - gate
restrictions - valid_from - valid_until - recurrence - status - QR token
metadata - revocation timestamp

QR tokens must be signed and short-lived where appropriate.

Do not encode sensitive resident information into QR payloads.

## 10. API conventions

Prefix: `/api/v1`

Resources: - /auth - /societies - /memberships - /units - /residents -
/visitors - /passes - /gates - /guards - /vehicles - /staff -
/notifications

Actions may be explicit for state transitions: - POST
/visitors/{id}/approve - POST /visitors/{id}/reject - POST
/gates/{gate_id}/check-in - POST /gates/{gate_id}/check-out

Do not create screen-shaped endpoints.

## 11. Idempotency

All gate and payment-like mutation endpoints must support idempotency
keys.

Especially: - check-in - check-out - gate open - approval - payment
initiation

A retry must never duplicate an entry.

## 12. WebSockets

Use WebSockets for: - visitor approval requests - visitor arrival
updates - guard queue updates - gate/device status - critical admin
dashboard events

REST remains the default for CRUD.

## 13. Notifications

Notification engine must support: - push - SMS - WhatsApp provider -
email - in-app

Business logic should emit notification intents rather than directly
calling providers.

Example: VISITOR_ARRIVED → notification policy → push + optional
fallback

## 14. Background jobs

Workers handle: - notification delivery - retries - report generation -
image processing - scheduled reminders - expired pass cleanup - sync
processing - analytics aggregation

Never make slow third-party work block a critical API request.

## 15. Storage

PostgreSQL stores metadata.

Object storage stores: - visitor images - documents - marketplace
media - complaint media - society media

Use signed URLs.

## 16. Security

Required: - secure passwordless/OTP authentication - short-lived access
tokens - refresh token rotation - device/session revocation - RBAC -
society isolation - rate limiting - input validation - audit logs -
encryption in transit - encryption at rest - secrets management - signed
passes - secure file upload validation - malware scanning where
required - data retention policies

## 17. API versioning

Never silently break clients.

Use: `/api/v1`

When breaking changes are necessary: `/api/v2`

Mobile clients must advertise app version and platform.

Backend must support a compatibility window.

## 18. Future integration abstraction

Create provider interfaces:

PaymentProvider NotificationProvider SmsProvider WhatsAppProvider
StorageProvider AccessControlProvider ANPRProvider
IdentityVerificationProvider

Implement one provider first.

Never scatter vendor-specific code through business modules.
