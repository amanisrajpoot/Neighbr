---
name: neighbr-context
description: >
  Full product and technical specification for Neighbr — a gated-community
  management platform. Use this skill before any significant feature work,
  architecture decisions, or when you need detailed specs for any domain
  (product/UX, backend/DB/API, mobile/native/offline, admin/ops, roadmap).
---

# Neighbr Context Skill

## How to Use This Skill

This skill is the **index** to the full Neighbr specification. Do NOT read all
reference files at once. Read ONLY the files relevant to your current task.

## Reference Files Index

| File | Domain | Read When... |
|------|--------|-------------|
| [00_MASTER_CONTEXT_MAP.md](references/00_MASTER_CONTEXT_MAP.md) | Vision, architecture, tech stack, engines, principles | Starting a new major feature, making architecture decisions, onboarding |
| [01_PRODUCT_UX_SPEC.md](references/01_PRODUCT_UX_SPEC.md) | UX strategy, screens, navigation, design system, states | Building any UI, designing screens, implementing navigation, design tokens |
| [02_BACKEND_DATABASE_API.md](references/02_BACKEND_DATABASE_API.md) | Backend modules, DB entities, API conventions, events, security | Creating endpoints, DB models, migrations, services, event types |
| [03_MOBILE_NATIVE_OFFLINE.md](references/03_MOBILE_NATIVE_OFFLINE.md) | Mobile architecture, offline sync, platform abstraction, native | Mobile features, offline logic, sync engine, native modules, permissions |
| [04_ADMIN_AND_SYSTEM_OPERATIONS.md](references/04_ADMIN_AND_SYSTEM_OPERATIONS.md) | Admin web, roles, onboarding wizard, dashboards, CI/CD | Admin panel features, reports, feature flags, deployment, ops tooling |
| [05_IMPLEMENTATION_ROADMAP_AND_ACCEPTANCE.md](references/05_IMPLEMENTATION_ROADMAP_AND_ACCEPTANCE.md) | Milestones, acceptance criteria, definition of done, agent rules | Planning sprints, checking milestone scope, validating completeness |

## Quick Domain Router

**Working on the backend?** → Read `02_BACKEND_DATABASE_API.md`
**Working on mobile UI?** → Read `01_PRODUCT_UX_SPEC.md` + `03_MOBILE_NATIVE_OFFLINE.md`
**Working on admin web?** → Read `01_PRODUCT_UX_SPEC.md` + `04_ADMIN_AND_SYSTEM_OPERATIONS.md`
**Working on offline/sync?** → Read `03_MOBILE_NATIVE_OFFLINE.md`
**Adding a new feature?** → Read `00_MASTER_CONTEXT_MAP.md` + `05_IMPLEMENTATION_ROADMAP_AND_ACCEPTANCE.md`
**Architecture decision?** → Read `00_MASTER_CONTEXT_MAP.md`

## Key Entities Quick Reference

### Product Engines (V1 Active)
Identity · Society · Access Control · Visitor · Vehicle · Staff/Domestic Help · Notification · Audit · Offline Sync

### Backend Module Layout
`backend/app/modules/` → auth, users, societies, buildings, units, memberships, residents, family, vehicles, gates, guards, visitors, visitor_passes, visitor_events, staff, vendors, notifications, audit, devices, permissions

### Module File Pattern
`modules/<name>/` → router.py, service.py, repository.py, models.py, schemas.py, permissions.py, events.py, tests/

### Mobile App Structure
`apps/mobile/app/` → (auth)/, (resident)/, (guard)/, (shared)/
`apps/mobile/src/` → features/, components/, navigation/, api/, state/, database/, sync/, platform/, permissions/, analytics/, utils/

### Visitor State Machine
`CREATED → INVITED → APPROVAL_PENDING → APPROVED → ARRIVED → CHECKED_IN → CHECKED_OUT → EXPIRED → CANCELLED → REJECTED`

### Milestones (ordered)
0: Repo foundation → 1: Identity → 2: Society → 3: Gates+Guards → 4: Visitor → 5: Offline guard → 6: Notifications → 7: Staff → 8: Vehicle → 9: Notices+Emergency → 10: Admin dashboard

## Change Control Checklist
Before implementing any feature, answer:
- [ ] Which engine owns it?
- [ ] Which role uses it?
- [ ] Which DB entities are involved?
- [ ] Which API endpoints are needed?
- [ ] Which events are emitted?
- [ ] Which permissions are required?
- [ ] Does it work offline?
- [ ] Does it require native capabilities?
- [ ] What notifications are triggered?
- [ ] What UI states exist?
- [ ] What future modules depend on it?
