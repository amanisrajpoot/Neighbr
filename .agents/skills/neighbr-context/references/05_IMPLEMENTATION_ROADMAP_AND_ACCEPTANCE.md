# Implementation Roadmap + Acceptance Criteria

## 1. Development philosophy

Rapid development does not mean skipping architecture.

Every milestone must end with: - working software - automated tests for
critical behavior - documented APIs - database migrations - no known
architectural shortcuts that block future modules

## 2. Milestone 0 --- Repository foundation

Create monorepo:

apps/ - mobile - admin

backend/

packages/ - api-types - validation - shared-config

Set up: - TypeScript - Python tooling - linting - formatting -
pre-commit - Docker - environment configuration - CI

Acceptance: - fresh developer can clone and run all services - CI
passes - staging deployment skeleton works

## 3. Milestone 1 --- Identity

Implement: - phone OTP - session - refresh - device registration - user
profile - society membership - roles - permissions

Acceptance: - same account can have different memberships - revoked
device cannot access protected APIs - role permissions are enforced
server-side

## 4. Milestone 2 --- Society model

Implement: - society - building/tower - floor - unit - resident -
owner/tenant - family - vehicle

Acceptance: - admin can create/import society - resident can be attached
to unit - all APIs enforce society scope

## 5. Milestone 3 --- Gates + Guards

Implement: - gates - guard profiles - guard devices - shifts - gate
assignment - device registration

Acceptance: - guard only sees assigned/authorized gates - revoked device
cannot operate - gate configuration can be changed by authorized admin

## 6. Milestone 4 --- Visitor engine

Implement: - visitor profile - visitor types - invitations - passes -
approval - rejection - arrival - check-in - check-out - history - inside
list

Acceptance critical flow:

Resident: 1. creates guest 2. receives pass

Guard: 3. scans pass 4. identifies resident/unit 5. checks authorization
6. requests approval if required

Resident: 7. approves

Guard: 8. checks in

Later: 9. guard checks out

Every step creates the correct event exactly once.

## 7. Milestone 5 --- Offline guard

Implement: - SQLite - cached operational data - mutation queue - sync -
idempotency - conflict handling - online/offline UI

Acceptance: - disconnect network - create visitor/check-in - app remains
functional - reconnect - server receives event once - duplicate sync
does not duplicate entry

## 8. Milestone 6 --- Notifications

Implement: - push registration - in-app notification - visitor approval
push - guard arrival notification - admin alerts

Acceptance: - notification delivered to correct audience - notification
preference respected - failed delivery logged

## 9. Milestone 7 --- Staff / domestic help

Implement: - staff profile - resident association - schedule -
attendance - entry/exit - staff pass

Acceptance: - staff can be authorized for selected units - guard sees
staff authorization - attendance recorded

## 10. Milestone 8 --- Vehicle

Implement: - vehicle profile - resident association - number - type -
parking slot - entry/exit

Future: - ANPR - FASTag - RFID

Acceptance: - vehicle can be linked to resident/unit - gate events can
associate vehicle

## 11. Milestone 9 --- Notices + emergency

Implement: - notice board - targeting - priority - expiry - push -
emergency contacts - SOS structure

Acceptance: - targeted notice only reaches intended audience - urgent
notice can be prioritized

## 12. Milestone 10 --- Admin operational dashboard

Implement: - dashboard - live security events - visitor reports - guard
status - device status - resident/unit management - notices - audit
viewer

Acceptance: - admin can investigate a visitor lifecycle from creation to
exit - all security actions are auditable

## 13. Milestone 11 --- Helpdesk

Implement: - ticket creation - category - priority - assignment - SLA -
comments - resolution - reopen - rating

## 14. Milestone 12 --- Amenities

Implement: - amenities - schedules - slots - booking - cancellation -
capacity - check-in

## 15. Milestone 13 --- Billing foundation

Implement carefully: - charge types - invoice - invoice item - payment
intent - payment transaction - receipt - ledger entry - reconciliation

Do not start with consumer BBPS.

## 16. Milestone 14 --- Community

Implement: - forum - comments - polls - notices integration - resident
directory - service directory

## 17. Milestone 15 --- Marketplace

Implement: - listing - sell - give away - category - search - filters -
messaging - report - moderation

## 18. Milestone 16 --- Service marketplace

Implement: - providers - service categories - bookings - vendor
verification - gate pass integration - ratings

## 19. Milestone 17 --- Hardware integration framework

Before integrating any one vendor, implement: - Device model - Device
credentials - Device health - AccessControlProvider interface -
webhook/event ingestion - command logging

Then integrate: - BLE - boom barrier - RFID - ANPR - smart lock as
vendor availability requires.

## 20. Milestone 18 --- Automation

Build generic: - trigger - condition - action - schedule - audience

Examples: visitor arrival → push bill due → reminder gate offline →
supervisor alert water low → facility alert

## 21. Milestone 19 --- AI

Only after clean event/data foundations.

Use cases: - natural-language helpdesk - admin questions -
visitor/security anomaly summaries - notice drafting - automated
categorization - resident assistant

AI must never bypass authorization.

## 22. Definition of Done

A feature is complete only when: - API implemented - database migration
exists - permissions exist - audit event defined - UI implemented -
loading/empty/error/offline states implemented - mobile behavior
tested - admin behavior tested if applicable - analytics/event tracking
defined - documentation updated - automated tests cover critical path

## 23. Regression gate

Before each release: - authentication - resident membership - visitor
approval - QR validation - check-in - check-out - offline sync -
notification - permission isolation - audit trail

must pass.

## 24. AI coding-agent rules

Any coding agent working on this repository must:

1.  Read `00_MASTER_CONTEXT_MAP.md` first.
2.  Read the relevant module specification before coding.
3.  Never invent a new architecture without updating the master map.
4.  Never create a new app unless explicitly approved.
5.  Never create a microservice unless explicitly approved.
6.  Never bypass society-level authorization.
7.  Never put business logic directly in UI components.
8.  Never store sensitive tokens in plain local storage.
9.  Never add a native dependency without checking iOS and Android
    support.
10. Never implement a feature only for one platform unless explicitly
    required.
11. Add tests for state transitions.
12. Add migrations for database changes.
13. Update API contracts when endpoints change.
14. Preserve backward compatibility where possible.
15. Do not silently remove existing functionality.
16. When a requested feature conflicts with architecture, explain the
    conflict before changing the architecture.

## 25. Change-control rule

When adding a new feature, answer:

-   Which engine owns it?
-   Which role uses it?
-   Which database entities are involved?
-   Which API endpoints are needed?
-   Which events are emitted?
-   Which permissions are required?
-   Does it work offline?
-   Does it require native capabilities?
-   What notifications are triggered?
-   What UI states exist?
-   What future modules depend on it?

Only then implement.
