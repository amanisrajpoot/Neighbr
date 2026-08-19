# Admin + System Operations Specification

## 1. Admin application

Next.js + TypeScript.

Desktop-first.

Responsive enough for tablets.

## 2. Admin roles

Platform: - super admin - support - operations - finance

Society: - society admin - president - secretary - treasurer - facility
manager - security supervisor - accountant

Permissions are configurable.

## 3. Society onboarding

Wizard:

1.  Society basic details
2.  Buildings/towers
3.  Floors
4.  Units
5.  Gates
6.  Amenities
7.  Residents
8.  Guards
9.  Staff
10. Notification settings
11. Billing settings later
12. Branding

Support bulk import: - CSV - Excel - API later

## 4. Admin dashboard

Show: - active visitors - waiting approvals - visitors inside - gate
health - guards on duty - recent security events - notices - open
complaints - pending operations

Future: - dues - payments - amenity utilization - vendor performance -
abnormal activity

## 5. Security console

Filters: - date - gate - visitor type - unit - status - guard - vehicle

Views: - live events - waiting visitors - inside visitors - history -
rejected entries - blacklisted entities - watchlists

## 6. Guard/device management

Admin can: - create guard - assign gate - assign shift - register
device - revoke device - remotely sign out - view online/offline - see
last sync - update app configuration

## 7. Notices

Create: - title - body - image/document - audience - building/tower/unit
targeting - publish time - expiry - priority - push notification

## 8. Audit

Every privileged admin action is audited.

Examples: - resident changed - unit reassigned - pass manually
approved - blacklist modified - gate configuration changed - guard
device revoked

Audit records should not be editable through normal UI.

## 9. Reports

V1: - visitor activity - guard attendance - gate activity - resident
count - staff attendance

Future: - billing - collections - vendor - amenities - SLA - security
analytics

Export: - CSV - XLSX later - PDF later

## 10. Super-admin

Platform-level: - societies - subscriptions - organizations - feature
flags - support access - system health - integration configuration -
provider configuration

Support access must be explicitly audited and time-bound.

## 11. Feature flags

Create feature flags from day one.

Examples: - marketplace_enabled - billing_enabled - amenities_enabled -
forum_enabled - smart_access_enabled

Feature flags may be: - platform-wide - society-specific - role-specific

This lets us deploy code before exposing functionality.

## 12. Configuration

Society-level configuration: - gates - visitor policies - pass
duration - allowed visitor types - approval requirements - working
hours - emergency contacts - staff rules - notification rules

Never hard-code society policies.

## 13. Operational tooling

Need: - health endpoint - metrics - structured logs - error tracking -
database migration tracking - queue monitoring - notification delivery
logs - device sync monitoring

## 14. Production environments

Minimum: - local - development - staging - production

No direct local-to-production deployments.

## 15. CI/CD

On pull request: - formatting - lint - type check - unit tests - backend
tests - migration checks - build validation

On merge: - staging deploy

Production: - controlled deployment - migration safety - rollback
strategy
