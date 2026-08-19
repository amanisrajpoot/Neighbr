/**
 * Local SQLite Schema for Guard Mobile App Offline Support
 */

export const CREATE_TABLES_SQL = `
-- Cached Operational Passes
CREATE TABLE IF NOT EXISTS local_passes (
    id TEXT PRIMARY KEY,
    qr_token TEXT UNIQUE,
    visitor_name TEXT NOT NULL,
    visitor_phone TEXT,
    unit_id TEXT NOT NULL,
    valid_from TEXT NOT NULL,
    valid_until TEXT NOT NULL,
    status TEXT NOT NULL,
    synced_at TEXT NOT NULL
);

-- Cached Units (Minimal PII)
CREATE TABLE IF NOT EXISTS local_units (
    id TEXT PRIMARY KEY,
    unit_number TEXT NOT NULL,
    building_name TEXT,
    resident_name TEXT,
    synced_at TEXT NOT NULL
);

-- Pending Mutation Queue
CREATE TABLE IF NOT EXISTS pending_operations (
    id TEXT PRIMARY KEY,
    operation_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    idempotency_key TEXT UNIQUE NOT NULL,
    payload TEXT NOT NULL,
    local_created_at TEXT NOT NULL,
    retry_count INTEGER DEFAULT 0,
    sync_state TEXT DEFAULT 'PENDING',
    synced_at TEXT,
    error_message TEXT
);
`;
