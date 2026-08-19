import { mutationQueue } from "./mutationQueue";

export interface SyncConfig {
  societyId: string;
  deviceId: string;
  gateId?: string;
  baseUrl: string;
  authToken: string;
}

export class SyncManager {
  private isSyncing = false;

  async flush(config: SyncConfig): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) return { synced: 0, failed: 0 };
    const pending = mutationQueue.getPending();
    if (pending.length === 0) return { synced: 0, failed: 0 };

    this.isSyncing = true;
    try {
      const response = await fetch(`${config.baseUrl}/api/v1/sync/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.authToken}`,
        },
        body: JSON.stringify({
          society_id: config.societyId,
          device_id: config.deviceId,
          gate_id: config.gateId,
          operations: pending.map((op) => ({
            operation_id: op.id,
            operation_type: op.operation_type,
            entity_type: op.entity_type,
            idempotency_key: op.idempotency_key,
            local_created_at: op.local_created_at,
            payload: op.payload,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed with HTTP status ${response.status}`);
      }

      const data = await response.json();
      for (const res of data.results) {
        if (res.status === "SYNCED") {
          mutationQueue.markSynced(res.operation_id);
        } else {
          mutationQueue.markFailed(res.operation_id, res.error);
        }
      }
      mutationQueue.clearSynced();
      return { synced: data.synced_count, failed: data.failed_count };
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncManager = new SyncManager();
