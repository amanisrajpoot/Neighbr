export interface PendingOperation {
  id: string;
  operation_type: string;
  entity_type: string;
  idempotency_key: string;
  payload: Record<string, unknown>;
  local_created_at: string;
  retry_count: number;
  sync_state: "PENDING" | "SYNCING" | "SYNCED" | "FAILED" | "CONFLICT";
}

export class MutationQueue {
  private inMemoryQueue: PendingOperation[] = [];

  enqueue(
    operationType: string,
    entityType: string,
    payload: Record<string, unknown>,
    idempotencyKey?: string
  ): PendingOperation {
    const op: PendingOperation = {
      id: `op-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      operation_type: operationType,
      entity_type: entityType,
      idempotency_key:
        idempotencyKey || `idem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      payload,
      local_created_at: new Date().toISOString(),
      retry_count: 0,
      sync_state: "PENDING",
    };
    this.inMemoryQueue.push(op);
    return op;
  }

  getPending(): PendingOperation[] {
    return this.inMemoryQueue.filter(
      (op) => op.sync_state === "PENDING" || op.sync_state === "FAILED"
    );
  }

  markSynced(operationId: string) {
    const op = this.inMemoryQueue.find((o) => o.id === operationId);
    if (op) {
      op.sync_state = "SYNCED";
    }
  }

  markFailed(operationId: string, error?: string) {
    const op = this.inMemoryQueue.find((o) => o.id === operationId);
    if (op) {
      op.retry_count += 1;
      op.sync_state = op.retry_count > 5 ? "FAILED" : "PENDING";
    }
  }

  clearSynced() {
    this.inMemoryQueue = this.inMemoryQueue.filter((op) => op.sync_state !== "SYNCED");
  }

  size(): number {
    return this.inMemoryQueue.length;
  }
}

export const mutationQueue = new MutationQueue();
