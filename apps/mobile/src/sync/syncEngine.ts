import { localDb, PendingOperation } from "../database/sqlite";
import { apiClient } from "../api/client";
import { create } from "zustand";

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: Date | null;
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setPendingCount: (count: number) => void;
  setLastSyncedAt: (date: Date) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncedAt: null,
  setOnline: (isOnline) => set({ isOnline }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
}));

export class SyncEngine {
  private syncTimer: any = null;

  async init(): Promise<void> {
    await localDb.init();
    await this.refreshPendingCount();
    this.startAutoSync();
  }

  async refreshPendingCount(): Promise<number> {
    const count = await localDb.getPendingCount();
    useSyncStore.getState().setPendingCount(count);
    return count;
  }

  startAutoSync(intervalMs: number = 15000): void {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => {
      this.flushQueue().catch(() => {});
    }, intervalMs);
  }

  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  async pullOperationalCache(societyId: string, gateId?: string): Promise<void> {
    try {
      const data = await apiClient<{
        passes: any[];
        units: any[];
      }>(`/sync/guard-pull?society_id=${societyId}${gateId ? `&gate_id=${gateId}` : ""}`);

      if (data.passes) {
        await localDb.cachePasses(
          data.passes.map((p) => ({
            id: p.id,
            qr_token: p.qr_token || p.id,
            visitor_name: p.visitor_name,
            visitor_phone: p.visitor_phone,
            unit_id: p.unit_id,
            valid_from: p.valid_from,
            valid_until: p.valid_until,
            status: p.status,
            synced_at: new Date().toISOString(),
          }))
        );
      }

      if (data.units) {
        await localDb.cacheUnits(
          data.units.map((u) => ({
            id: u.id,
            unit_number: u.unit_number,
            building_name: u.building_name,
            resident_name: u.resident_name,
            synced_at: new Date().toISOString(),
          }))
        );
      }

      useSyncStore.getState().setLastSyncedAt(new Date());
      useSyncStore.getState().setOnline(true);
    } catch (err) {
      // If pull fails, assume offline or network disturbance
      useSyncStore.getState().setOnline(false);
    }
  }

  async flushQueue(): Promise<void> {
    const pendingOps = await localDb.getPendingOperations();
    if (pendingOps.length === 0) {
      await this.refreshPendingCount();
      return;
    }

    useSyncStore.getState().setSyncing(true);

    let allSucceeded = true;
    for (const op of pendingOps) {
      try {
        const payload = JSON.parse(op.payload);
        await apiClient("/sync/guard-push", {
          method: "POST",
          headers: {
            "X-Idempotency-Key": op.idempotency_key,
          },
          body: JSON.stringify({
            operation_id: op.id,
            operation_type: op.operation_type,
            entity_type: op.entity_type,
            payload,
            local_created_at: op.local_created_at,
          }),
        });

        await localDb.markOperationSynced(op.id);
      } catch (err: any) {
        allSucceeded = false;
        await localDb.markOperationFailed(op.id, err.message || "Network error");
        useSyncStore.getState().setOnline(false);
        break; // Stop queue processing if connection is down
      }
    }

    if (allSucceeded) {
      useSyncStore.getState().setOnline(true);
    }

    useSyncStore.getState().setSyncing(false);
    await this.refreshPendingCount();
    useSyncStore.getState().setLastSyncedAt(new Date());
  }

  // --- CONVENIENCE OFFLINE MUTATION RECORDERS ---

  async logCheckIn(passId: string, gateId: string, metadata: Record<string, any> = {}): Promise<string> {
    const idempotencyKey = `chk-in-${passId}-${Date.now()}`;
    const opId = await localDb.queueOperation(
      "CHECK_IN",
      "VISITOR",
      { pass_id: passId, gate_id: gateId, ...metadata },
      idempotencyKey
    );
    await this.refreshPendingCount();
    this.flushQueue().catch(() => {});
    return opId;
  }

  async logWalkIn(visitorData: {
    visitor_name: string;
    visitor_phone?: string;
    unit_id: string;
    visitor_type: string;
    vehicle_number?: string;
    gate_id: string;
  }): Promise<string> {
    const idempotencyKey = `walk-in-${visitorData.unit_id}-${Date.now()}`;
    const opId = await localDb.queueOperation(
      "WALK_IN",
      "VISITOR",
      visitorData,
      idempotencyKey
    );
    await this.refreshPendingCount();
    this.flushQueue().catch(() => {});
    return opId;
  }

  async logCheckOut(visitorId: string, gateId: string): Promise<string> {
    const idempotencyKey = `chk-out-${visitorId}-${Date.now()}`;
    const opId = await localDb.queueOperation(
      "CHECK_OUT",
      "VISITOR",
      { visitor_id: visitorId, gate_id: gateId },
      idempotencyKey
    );
    await this.refreshPendingCount();
    this.flushQueue().catch(() => {});
    return opId;
  }
}

export const syncEngine = new SyncEngine();
