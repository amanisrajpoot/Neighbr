# Community Platform --- Master Context Map

## 0. Purpose

This repository is the canonical implementation context for building a
rapid-development gated-community platform intended to compete with
MyGate, NoBrokerHood, ADDA and similar products.

The product must begin as a focused, deployable MVP while preserving an
architecture capable of eventually supporting the full feature breadth
of mature society-management platforms.

**Core principle:** build a small first release on top of a
large-capability skeleton.

## 1. Product vision

One platform connecting:

-   Residents
-   Guards
-   Society/RWA administrators
-   Committee members
-   Facility managers
-   Accountants
-   Vendors/service providers
-   Society hardware and IoT

Core promise:

> One identity. One gate. One community. One operational and financial
> system.

## 2. Application strategy

Build only two frontends initially:

### Mobile

One React Native + Expo application compiled into: - iOS - Android

The same binary supports different role experiences: - Resident -
Guard - Committee - Facility manager - Staff/vendor later

Do NOT create separate Resident and Guard codebases.

### Admin Web

Next.js web application for: - Society administration - Security
supervisors - Committee - Accounting - Facility operations - Platform
super-admin

### Backend

One FastAPI modular monolith.

### Data

PostgreSQL as source of truth.

Supporting infrastructure: - Redis - SQLite on mobile for offline-first
gate workflows - S3-compatible object storage - Background workers -
REST + WebSocket - Push notifications

## 3. Technology decisions

### Mobile

-   React Native
-   Expo
-   TypeScript
-   Expo Router
-   TanStack Query
-   Zustand
-   React Hook Form
-   Zod
-   SQLite
-   SecureStore
-   Native modules through Expo Modules / React Native native modules

### Web

-   Next.js
-   TypeScript
-   Tailwind CSS
-   Component library/design system

### Backend

-   Python
-   FastAPI
-   SQLAlchemy 2.x
-   Alembic
-   Pydantic
-   PostgreSQL
-   Redis
-   Background worker system

### Infrastructure

-   Docker
-   Managed PostgreSQL
-   Managed Redis
-   S3-compatible storage
-   Cloud deployment
-   CI/CD

## 4. Native capability requirement

The mobile architecture must never assume Expo-only capabilities.

Create a platform abstraction layer:

`location`, `bluetooth`, `wifi`, `nfc`, `camera`, `biometrics`,
`notifications`, `contacts`, `phone`, `background`, `secure-storage`,
`access-control`, `device`.

When a capability requires native code or a vendor SDK, implement an iOS
Swift and Android Kotlin adapter behind the same TypeScript interface.

The product must be capable of integrating, where OS/vendor support
permits: - GPS/geofencing - background location - BLE - NFC -
QR/barcode - camera - biometrics - Wi-Fi/network information - RFID
readers - FASTag systems - ANPR/LPR - boom barriers - smart locks -
elevators - intercom - CCTV integrations - IoT sensors - access-control
controllers

Do not promise functionality that iOS/Android policy prevents; instead
build the abstraction so permitted native/vendor capabilities can be
added without rewriting business logic.

## 5. Architectural principles

1.  Modular monolith first.
2.  Feature modules, not screen modules.
3.  PostgreSQL is the source of truth.
4.  Every major business action produces an auditable event.
5.  Gate workflows are event-driven.
6.  Guard operation is offline-first.
7.  All tenant data is society-scoped.
8.  Permissions are data-driven RBAC, not hard-coded role checks.
9.  API contracts are generated/shared wherever practical.
10. Native functionality is hidden behind platform adapters.
11. UI is a view of domain capabilities, not the domain itself.
12. Do not implement future features prematurely, but reserve clean
    module boundaries for them.
13. Do not introduce microservices until scale or ownership boundaries
    justify extraction.
14. Do not store media binaries in PostgreSQL.
15. Never couple payments to a single payment provider.

## 6. Product engines

The long-term platform is composed of:

-   Identity Engine
-   Society Engine
-   Access Control Engine
-   Visitor Engine
-   Vehicle Engine
-   Staff/Domestic Help Engine
-   Notification Engine
-   Billing Engine
-   Accounting Engine
-   Payment Engine
-   Amenity Engine
-   Helpdesk Engine
-   Community Engine
-   Marketplace Engine
-   Service Marketplace Engine
-   Document Engine
-   Automation Engine
-   Device/IoT Engine
-   Integration Engine
-   Audit/Event Engine
-   Offline Sync Engine
-   Analytics Engine
-   AI Engine

V1 activates only the engines required for: - Identity - Society -
Residents - Gates - Visitors - Vehicles - Staff - Notifications -
Audit - Offline sync

## 7. Long-term feature parity target

The architecture must be able to accommodate the major functionality
families seen in mature products:

Security: - Visitor pre-approval - Guest passes - Delivery management -
Cab/service provider entry - Daily help - Staff attendance - Vehicle
management - Parking - QR/OTP - Gate-to-gate logs - Overstay alerts -
Blacklists/watchlists - Emergency access - Offline gate operation -
Resident calling - IVR fallback - Hardware access control

Society operations: - Notices - Complaints/helpdesk - Vendors - Assets -
Documents - Committee - Polls - Events - Amenity booking - Facility
management

Finance: - Maintenance invoices - Utility billing - Penalties - Partial
payments - Receipts - Ledger - Reconciliation - Expenses - Budget -
Reports - Payment integrations

Community: - Forum - Resident directory - Service directory -
Marketplace - Give-away - Events - Polls - Community groups

Commerce: - Home services - Vendor marketplace - Property marketplace -
Rent - Rental services - Offers

Smart society: - ANPR - RFID - FASTag - BLE access - NFC - Smart locks -
Boom barriers - IoT sensors - prepaid meters - CCTV/AI integrations

## 8. UI/UX reference context

The supplied screenshots are the visual/product reference set.

Important observed patterns: - My Hood/community feed - Society
dashboard - Home dashboard - Quick actions - Visitors - My Bills -
Helpdesk - Marketplace - Gate passes - Amenities - Directory - Guards
Directory - Notice Board - SOS - Notify Gate - Forum - Services -
Property/Homes - Profile - Payments - Utility bills - Society
information

The screenshots are references, not a command to clone their branding.

UX goal: - familiar enough to reduce learning - cleaner and less
cluttered than mature competitors - task-first home screen -
role-specific navigation - high-priority actions above the fold - strong
visual hierarchy - minimal typing - large guard controls - clear status
states - excellent empty/loading/error/offline states

## 9. Non-goals for V1

Do not build initially: - full accounting ERP - consumer BBPS - property
marketplace - home-service marketplace - advanced AI - hardware
marketplace - complex IoT dashboard - microservice infrastructure -
multi-region deployment - complicated analytics warehouse

But all must remain architecturally addable.

## 10. Definition of architectural success

A future developer/AI agent must be able to add a module such as
Billing, Amenities or Marketplace without changing: - authentication
fundamentals - society tenancy model - navigation architecture - API
conventions - event model - storage model - offline sync foundations

If adding a future module requires rewriting the core, the architecture
has failed.
