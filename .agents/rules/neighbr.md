# Neighbr — Workspace Rules

## Project Identity
Neighbr is a gated-community management platform (competitor to MyGate, NoBrokerHood, ADDA).

## Architecture (Do Not Violate)
- **Backend:** Python FastAPI modular monolith, SQLAlchemy 2.x, PostgreSQL, Redis
- **Mobile:** React Native + Expo (single binary, role-based UX), TypeScript
- **Admin Web:** Next.js + TypeScript + Tailwind CSS
- **Data:** PostgreSQL (source of truth), SQLite (mobile offline), Redis (cache), S3 (media)

## Hard Rules
1. Read the `neighbr-context` skill before any significant feature work.
2. Never create microservices, separate apps, or new backends without approval.
3. All data is society-scoped. Never trust `society_id` from client requests.
4. Business logic lives in services, never in UI components or routers.
5. Gate workflows are offline-first and event-driven.
6. Permissions are RBAC, never hard-coded role checks.
7. Every major action emits an auditable event.
8. Never store secrets/tokens in plain storage. Use SecureStore/keychain.
9. Never add native dependencies without checking both iOS and Android.
10. Add migrations for all DB changes. Add tests for state transitions.
11. API prefix: `/api/v1`. Never create screen-shaped endpoints.
12. Gate/payment mutations must support idempotency keys.

## V1 Scope
Identity, Society, Residents, Gates, Visitors, Vehicles, Staff, Notifications, Audit, Offline Sync.

## When in Doubt
Run: "Read the `neighbr-context` skill" — it contains the full product spec, backend design, mobile architecture, admin spec, and implementation roadmap.
