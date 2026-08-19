import * as SQLite from "expo-sqlite";
import { CREATE_TABLES_SQL } from "./schema";

export interface LocalPass {
  id: string;
  qr_token: string;
  visitor_name: string;
  visitor_phone?: string;
  unit_id: string;
  valid_from: string;
  valid_until: string;
  status: string;
  synced_at: string;
}

export interface LocalUnit {
  id: string;
  unit_number: string;
  building_name?: string;
  resident_name?: string;
  synced_at: string;
}

export interface PendingOperation {
  id: string;
  operation_type: "CHECK_IN" | "CHECK_OUT" | "WALK_IN" | "DENY";
  entity_type: "VISITOR" | "STAFF" | "VEHICLE";
  idempotency_key: string;
  payload: string; // JSON string
  local_created_at: string;
  retry_count: number;
  sync_state: "PENDING" | "SYNCING" | "SYNCED" | "FAILED";
  synced_at?: string;
  error_message?: string;
}

class LocalDatabase {
  private db: SQLite.SQLiteDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    try {
      this.db = await SQLite.openDatabaseAsync("neighbr_guard.db");
      await this.db.execAsync(CREATE_TABLES_SQL);
    } catch (err) {
      console.warn("Failed to initialize SQLite:", err);
    }
  }

  private async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error("SQLite database failed to open");
    }
    return this.db;
  }

  // --- PASS CACHING & LOOKUP ---

  async cachePasses(passes: LocalPass[]): Promise<void> {
    const db = await this.getDb();
    for (const p of passes) {
      await db.runAsync(
        `INSERT OR REPLACE INTO local_passes 
         (id, qr_token, visitor_name, visitor_phone, unit_id, valid_from, valid_until, status, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.qr_token, p.visitor_name, p.visitor_phone || "", p.unit_id, p.valid_from, p.valid_until, p.status, p.synced_at]
      );
    }
  }

  async findPassByToken(qrToken: string): Promise<LocalPass | null> {
    const db = await this.getDb();
    const result = await db.getFirstAsync<LocalPass>(
      `SELECT * FROM local_passes WHERE qr_token = ? LIMIT 1`,
      [qrToken]
    );
    return result || null;
  }

  // --- UNIT CACHING & LOOKUP ---

  async cacheUnits(units: LocalUnit[]): Promise<void> {
    const db = await this.getDb();
    for (const u of units) {
      await db.runAsync(
        `INSERT OR REPLACE INTO local_units 
         (id, unit_number, building_name, resident_name, synced_at)
         VALUES (?, ?, ?, ?, ?)`,
        [u.id, u.unit_number, u.building_name || "", u.resident_name || "", u.synced_at]
      );
    }
  }

  async searchUnits(query: string): Promise<LocalUnit[]> {
    const db = await this.getDb();
    const pattern = `%${query}%`;
    return await db.getAllAsync<LocalUnit>(
      `SELECT * FROM local_units WHERE unit_number LIKE ? OR resident_name LIKE ? LIMIT 20`,
      [pattern, pattern]
    );
  }

  // --- PENDING MUTATIONS QUEUE ---

  async queueOperation(
    operationType: PendingOperation["operation_type"],
    entityType: PendingOperation["entity_type"],
    payload: Record<string, any>,
    idempotencyKey: string
  ): Promise<string> {
    const db = await this.getDb();
    const opId = `op-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO pending_operations
       (id, operation_type, entity_type, idempotency_key, payload, local_created_at, retry_count, sync_state)
       VALUES (?, ?, ?, ?, ?, ?, 0, 'PENDING')`,
      [opId, operationType, entityType, idempotencyKey, JSON.stringify(payload), now]
    );

    return opId;
  }

  async getPendingOperations(): Promise<PendingOperation[]> {
    const db = await this.getDb();
    return await db.getAllAsync<PendingOperation>(
      `SELECT * FROM pending_operations WHERE sync_state IN ('PENDING', 'FAILED') ORDER BY local_created_at ASC`
    );
  }

  async getPendingCount(): Promise<number> {
    const db = await this.getDb();
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pending_operations WHERE sync_state != 'SYNCED'`
    );
    return result?.count || 0;
  }

  async markOperationSynced(id: string): Promise<void> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE pending_operations SET sync_state = 'SYNCED', synced_at = ? WHERE id = ?`,
      [now, id]
    );
  }

  async markOperationFailed(id: string, errorMessage: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `UPDATE pending_operations 
       SET sync_state = 'FAILED', retry_count = retry_count + 1, error_message = ? 
       WHERE id = ?`,
      [errorMessage, id]
    );
  }
}

export const localDb = new LocalDatabase();
