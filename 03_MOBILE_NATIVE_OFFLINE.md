# Mobile + Native + Offline Implementation Specification

## 1. Mobile objective

One React Native application compiled for: - iOS - Android

Role-based experiences: - resident - guard - committee - staff -
facility manager - vendor later

## 2. Project

Use Expo with development builds/custom native capability.

Do not depend on Expo Go for production capabilities.

The project must be able to include: - Swift native modules - Kotlin
native modules - third-party native SDKs - custom config plugins when
required

## 3. Mobile folder structure

apps/mobile/

app/ - (auth)/ - (resident)/ - (guard)/ - (shared)/

src/ - features/ - components/ - navigation/ - api/ - state/ -
database/ - sync/ - platform/ - permissions/ - analytics/ - utils/

## 4. Feature architecture

Each feature owns: - screens - hooks - API functions - query keys -
schemas - local models - state - tests

Shared UI must not contain business logic.

## 5. Data strategy

Remote: - TanStack Query - FastAPI

Local: - SQLite - local cache - queued mutations

Zustand is for UI/session state, not as the primary server-state store.

## 6. Offline-first guard architecture

Local database contains a safe, minimal operational subset: - assigned
gate - active residents/units needed for gate operation - active
passes - visitor identity data required for verification - recent
entries - emergency contacts - guard shift information - pending
operations

Never cache unnecessary sensitive resident data.

## 7. Sync engine

Each local mutation receives: - operation_id UUID - device_id -
local_created_at - entity_type - entity_id - operation_type - payload -
retry_count - sync_state

States: PENDING → SYNCING → SYNCED

Failure: FAILED → RETRYING → SYNCED

Permanent conflict: CONFLICT → explicit resolution policy

## 8. Conflict rules

Gate check-in/out operations should be append-only events.

Do not resolve by blindly overwriting records.

Server should deduplicate using: - operation_id - idempotency key -
device_id

## 9. Platform abstraction

src/platform/

location/ - getCurrentLocation - startGeofence - stopGeofence

bluetooth/ - scan - connect - disconnect - read - write

wifi/ - getNetworkState - getConnectionInfo where OS permits

nfc/ - read - write where supported

camera/ - capture - scanQr

biometrics/ - isAvailable - authenticate

notifications/ - register - token - local - remote

access-control/ - discover - connect - openGate - closeGate - status

Every adapter must expose a consistent TypeScript interface.

## 10. GPS

Use only where product logic requires it.

Potential uses: - guard attendance geofence - gate assignment
verification - facility staff attendance - location-aware workflows

Background location must be opt-in, clearly explained and implemented
according to Apple/Google policy.

Do not continuously track residents unless a clearly justified feature
requires it.

## 11. Bluetooth

Potential: - smart gate access - gate controller - smart lock - BLE
credential - device configuration

Keep Bluetooth logic out of visitor/business modules.

Use: business logic → access-control service → BLE adapter.

## 12. NFC

Potential: - staff cards - access credentials - hardware configuration -
identity/access tokens

Treat NFC as an optional capability based on device/OS.

## 13. Camera

Used for: - QR scanning - visitor photo - vehicle image - document
capture - ANPR integration where permitted

## 14. Permissions

Create a permission manager.

Never ask for every permission at first launch.

Ask contextually: - camera when scanning - location when location
feature starts - Bluetooth when access-control feature starts -
notifications during onboarding/context - contacts only when needed

Explain why before OS prompt.

## 15. Push notification strategy

Resident: - visitor waiting - approval request - society notice -
payment due later - ticket updates

Guard: - configuration changes - critical supervisor messages

Use local notifications for device-local reminders.

## 16. Security

Use: - SecureStore/keychain/keystore - device-bound sessions where
appropriate - biometric re-authentication for sensitive actions - no
secrets in source - no permanent access tokens in plain storage

## 17. App updates

Use OTA updates only for changes safe under the current native binary.

Any native dependency/capability change requires a new binary.

Maintain: - runtime version - app version - API compatibility

## 18. Performance targets

Resident: - fast cold start - smooth list scrolling - image lazy
loading - pagination

Guard: - scan-to-result should feel immediate - offline operation must
not depend on network - minimal animation - minimal battery drain

## 19. Testing

Mobile: - unit tests - component tests - API integration - offline sync
tests - permission tests - device tests - E2E tests for critical flows

Critical E2E: - resident invites visitor - guard sees visitor - resident
approves - guard checks in - visitor checks out - network disconnects -
guard continues - network returns - events sync exactly once
