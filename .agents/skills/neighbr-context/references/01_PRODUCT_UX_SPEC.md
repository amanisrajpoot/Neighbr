# Product + UI/UX Specification

## 1. UX strategy

The app should not be a collection of competitor screens.

Design around user intent.

### Resident asks:

-   Who is at my gate?
-   Can I let someone in?
-   Do I owe anything?
-   What is happening in my society?
-   I need help.
-   I want to book something.
-   I want to contact someone.

### Guard asks:

-   Who is this?
-   Which flat?
-   Is entry approved?
-   What should I do?
-   Who is inside?
-   How do I record exit?

### Admin asks:

-   What needs attention?
-   Who entered?
-   What is pending?
-   What is unpaid?
-   What complaints are overdue?
-   What is happening operationally?

## 2. Visual direction

Reference the supplied screenshots for: - information density - card
patterns - bottom navigation - quick-action tiles - status chips - list
rows - modal/sheet interactions - empty states - service cards -
marketplace cards

Do not copy logos, proprietary branding, or exact visual identity.

Design language: - clean - modern - trustworthy - security-oriented -
approachable - Indian residential context - touch-first - accessible
contrast - consistent spacing - predictable actions

## 3. Resident information architecture

Primary navigation target:

1.  Home
2.  My Gate / Visitors
3.  Community
4.  Services
5.  Society

Profile is accessible from the account/avatar area.

Exact bottom-nav labels can be finalized during design exploration, but
navigation must remain stable.

## 4. Resident Home

Home should be dynamic rather than a static icon grid.

Priority order:

### Critical

-   visitor waiting
-   urgent notice
-   emergency/SOS
-   payment due

### Today's activity

-   daily help
-   upcoming visitor
-   amenity booking
-   package/delivery
-   open complaint

### Society

-   notices
-   announcements
-   polls
-   events

### Convenience

-   marketplace
-   services
-   directory

The home feed should be configurable by society.

## 5. Resident visitor experience

### Main visitor screen

Sections: - Waiting at gate - Expected today - Upcoming - Recent history

Actions: - Invite guest - Create pass - Approve - Reject - Share pass -
Revoke pass

### Visitor types

-   Guest
-   Delivery
-   Cab
-   Service provider
-   Domestic help
-   Other

### Guest invite

Fields: - name - phone optional depending on flow - visitor type -
date/time - recurrence - vehicle optional - notes optional

Output: - signed pass/QR - expiry - visitor instructions

## 6. Guard UX

The guard UI is deliberately different.

Home: - current gate - online/offline state - scan - waiting approvals -
quick visitor categories - visitors inside - staff attendance - recent
events

Large touch targets. Minimal text entry. High contrast. One-handed use.
Fast scan flow.

### Guard check-in flow

1.  Scan QR / search / select type
2.  Identify resident/unit
3.  Display visitor identity
4.  Determine authorization
5.  If approval required, request resident approval
6.  Record entry
7.  Capture photo if policy requires
8.  Display success
9.  Sync event

### Guard check-out

-   find visitor
-   confirm identity
-   record exit
-   optionally capture vehicle/exit information

## 7. Offline UI

Persistent indicator: - Online - Offline - Syncing - Sync error

Offline mode must explain: - what functions remain available - which
actions are queued - when data last synced

Do not show fake server confirmation.

Example: "Entry saved on this device. Waiting for sync."

## 8. Admin UX

Admin is desktop-first.

Main areas: - Dashboard - Society - Residents - Units - Security -
Staff - Visitors - Vehicles - Notices - Helpdesk - Amenities - Billing
(future) - Reports - Settings

Dashboard should surface: - active visitors - gates online/offline -
pending approvals - guard status - open complaints - unpaid dues later -
alerts - unusual events

## 9. Design system

Create tokens for: - typography - spacing - radii - elevation - icon
sizes - colors - semantic status colors - dark mode readiness

Components: - Button - IconButton - Card - ListRow - Avatar - Badge -
StatusChip - BottomSheet - Modal - Input - Search - Tabs -
SegmentedControl - EmptyState - ErrorState - Skeleton - Toast - Banner -
Timeline - QR display - QR scanner - Permission prompt - Offline banner

## 10. State design

Every major screen must define: - loading - loaded - empty - error -
offline - permission denied - partially loaded - retry

Never design only the happy path.

## 11. Accessibility

Required: - dynamic text support - screen-reader labels - sufficient
contrast - minimum touch target sizes - not relying solely on color -
clear error messages - haptic feedback for security actions where
appropriate

## 12. UX rules

1.  Never ask for information the backend already knows.
2.  Prefer selection over typing.
3.  Use contextual defaults.
4.  Keep security actions explicit.
5.  Confirm destructive actions.
6.  Use optimistic UI only where safe.
7.  Never hide synchronization state.
8.  Keep guard workflows under a few taps.
9.  Use bottom sheets for short contextual actions.
10. Use full screens for complex forms.
11. Keep primary action visually obvious.
12. Avoid feature overload on Home.

## 13. Future UI modules

The design system must support: - billing dashboards - payment flows -
ledger tables - helpdesk timelines - amenity calendars - marketplace
listings - service bookings - document vault - property listings - IoT
dashboards - automation builder

Build reusable primitives now, not feature-specific styling.
