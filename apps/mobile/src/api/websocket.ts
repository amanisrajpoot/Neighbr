import { Platform } from "react-native";
import { getServerHost } from "./client";

export type WebSocketStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED";

export interface WebSocketMessage<T = any> {
  type: string;
  data?: T;
  [key: string]: any;
}

type MessageHandler<T = any> = (data: T) => void;
type StatusHandler = (status: WebSocketStatus) => void;

class RealtimeClient {
  private ws: WebSocket | null = null;
  private status: WebSocketStatus = "DISCONNECTED";
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 15;
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private statusListeners: Set<StatusHandler> = new Set();
  private currentEndpoint: string | null = null;
  private isIntentionallyClosed = false;

  private getWsUrl(path: string): string {
    const host = getServerHost();
    const isHttps = Platform.OS === "web" && typeof window !== "undefined" && window.location?.protocol === "https:";
    const wsProto = isHttps ? "wss" : "ws";
    return `${wsProto}://${host}${path}`;
  }

  public connect(params: { userId?: string; societyId?: string }) {
    this.isIntentionallyClosed = false;
    let endpoint = "";
    if (params.userId) {
      endpoint = `/ws/${params.userId}`;
    } else if (params.societyId) {
      endpoint = `/ws/society/${params.societyId}`;
    } else {
      console.warn("[WS] Cannot connect without userId or societyId");
      return;
    }

    if (this.currentEndpoint === endpoint && this.status === "CONNECTED") {
      return;
    }

    this.currentEndpoint = endpoint;
    this.initiateConnection();
  }

  private initiateConnection() {
    if (!this.currentEndpoint || this.isIntentionallyClosed) return;

    this.cleanup();
    this.setStatus("CONNECTING");

    const fullUrl = this.getWsUrl(this.currentEndpoint);
    try {
      this.ws = new WebSocket(fullUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus("CONNECTED");
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as WebSocketMessage;
          if (payload.type === "pong") return;

          // Dispatch to type listeners
          const eventType = payload.type;
          const handlers = this.listeners.get(eventType);
          if (handlers) {
            handlers.forEach((h) => h(payload.data ?? payload));
          }

          // Wildcard listeners
          const wildcardHandlers = this.listeners.get("*");
          if (wildcardHandlers) {
            wildcardHandlers.forEach((h) => h(payload));
          }
        } catch {
          // Non-JSON or plain text message
          if (event.data === "pong") return;
        }
      };

      this.ws.onerror = (e: any) => {
        console.warn("[WS] Error:", e?.message || "Socket error");
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.setStatus("DISCONNECTED");
        if (!this.isIntentionallyClosed) {
          this.scheduleReconnect();
        }
      };
    } catch (err: any) {
      console.warn("[WS] Connection failed to initialize:", err?.message);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || this.isIntentionallyClosed) {
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s... max 30s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts += 1;

    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.initiateConnection();
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.status === "CONNECTED") {
        try {
          this.ws.send(JSON.stringify({ type: "ping" }));
        } catch {
          // Ignore transient send failures
        }
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private setStatus(newStatus: WebSocketStatus) {
    this.status = newStatus;
    this.statusListeners.forEach((fn) => fn(newStatus));
  }

  public on<T = any>(eventType: string, handler: MessageHandler<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);
    return () => this.off(eventType, handler);
  }

  public off(eventType: string, handler: MessageHandler) {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  public onStatusChange(handler: StatusHandler): () => void {
    this.statusListeners.add(handler);
    handler(this.status);
    return () => {
      this.statusListeners.delete(handler);
    };
  }

  public send(message: Record<string, any>) {
    if (this.ws && this.status === "CONNECTED") {
      this.ws.send(JSON.stringify(message));
    }
  }

  public disconnect() {
    this.isIntentionallyClosed = true;
    this.cleanup();
    this.setStatus("DISCONNECTED");
  }

  private cleanup() {
    clearTimeout(this.reconnectTimer);
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }

  public getStatus(): WebSocketStatus {
    return this.status;
  }
}

export const realtimeClient = new RealtimeClient();
