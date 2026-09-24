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

class WebLocalDatabase {
  private memoryPasses: Map<string, LocalPass> = new Map();
  private memoryUnits: Map<string, LocalUnit> = new Map();
  private memoryOps: Map<string, PendingOperation> = new Map();

  async init(): Promise<void> {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const storedPasses = localStorage.getItem("neighbr_local_passes");
        if (storedPasses) {
          const list: LocalPass[] = JSON.parse(storedPasses);
          list.forEach((p) => this.memoryPasses.set(p.id, p));
        }

        const storedUnits = localStorage.getItem("neighbr_local_units");
        if (storedUnits) {
          const list: LocalUnit[] = JSON.parse(storedUnits);
          list.forEach((u) => this.memoryUnits.set(u.id, u));
        }

        const storedOps = localStorage.getItem("neighbr_local_ops");
        if (storedOps) {
          const list: PendingOperation[] = JSON.parse(storedOps);
          list.forEach((o) => this.memoryOps.set(o.id, o));
        }
      } catch (e) {
        console.warn("Failed to load local storage cache:", e);
      }
    }
  }

  private persist(key: string, data: any) {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {}
    }
  }

  async cachePasses(passes: LocalPass[]): Promise<void> {
    for (const p of passes) {
      this.memoryPasses.set(p.id, p);
    }
    this.persist("neighbr_local_passes", Array.from(this.memoryPasses.values()));
  }

  async findPassByToken(qrToken: string): Promise<LocalPass | null> {
    for (const p of this.memoryPasses.values()) {
      if (p.qr_token === qrToken) return p;
    }
    return null;
  }

  async cacheUnits(units: LocalUnit[]): Promise<void> {
    for (const u of units) {
      this.memoryUnits.set(u.id, u);
    }
    this.persist("neighbr_local_units", Array.from(this.memoryUnits.values()));
  }

  async searchUnits(query: string): Promise<LocalUnit[]> {
    const q = query.toLowerCase();
    const results: LocalUnit[] = [];
    for (const u of this.memoryUnits.values()) {
      if (
        u.unit_number.toLowerCase().includes(q) ||
        (u.resident_name && u.resident_name.toLowerCase().includes(q))
      ) {
        results.push(u);
        if (results.length >= 20) break;
      }
    }
    return results;
  }

  async queueOperation(
    operationType: PendingOperation["operation_type"],
    entityType: PendingOperation["entity_type"],
    payload: Record<string, any>,
    idempotencyKey: string
  ): Promise<string> {
    const opId = `op-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();
    const op: PendingOperation = {
      id: opId,
      operation_type: operationType,
      entity_type: entityType,
      idempotency_key: idempotencyKey,
      payload: JSON.stringify(payload),
      local_created_at: now,
      retry_count: 0,
      sync_state: "PENDING",
    };
    this.memoryOps.set(opId, op);
    this.persist("neighbr_local_ops", Array.from(this.memoryOps.values()));
    return opId;
  }

  async getPendingOperations(): Promise<PendingOperation[]> {
    return Array.from(this.memoryOps.values()).filter(
      (o) => o.sync_state === "PENDING" || o.sync_state === "FAILED"
    );
  }

  async getPendingCount(): Promise<number> {
    return Array.from(this.memoryOps.values()).filter(
      (o) => o.sync_state !== "SYNCED"
    ).length;
  }

  async markOperationSynced(id: string): Promise<void> {
    const op = this.memoryOps.get(id);
    if (op) {
      op.sync_state = "SYNCED";
      op.synced_at = new Date().toISOString();
      this.persist("neighbr_local_ops", Array.from(this.memoryOps.values()));
    }
  }

  async markOperationFailed(id: string, errorMessage: string): Promise<void> {
    const op = this.memoryOps.get(id);
    if (op) {
      op.sync_state = "FAILED";
      op.retry_count += 1;
      op.error_message = errorMessage;
      this.persist("neighbr_local_ops", Array.from(this.memoryOps.values()));
    }
  }
}

export const localDb = new WebLocalDatabase();
