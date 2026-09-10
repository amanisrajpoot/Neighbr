import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { getServerHost, getBaseUrl } from "../api/client";
import { useAuthStore } from "../store/authStore";

interface HealthData {
  status: "healthy" | "degraded" | "offline";
  service?: string;
  database?: {
    status: string;
    connected: boolean;
    type: string;
    latency_ms?: number;
  };
  latencyMs?: number;
  error?: string;
}

export function DevStatusNotifier() {
  // If not in development mode, completely eliminate from render tree
  if (!__DEV__) {
    return null;
  }

  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);

  const [health, setHealth] = useState<HealthData>({ status: "offline" });
  const [checking, setChecking] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const checkHealth = useCallback(async () => {
    try {
      setChecking(true);
      const host = getServerHost();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const startTime = Date.now();
      const res = await fetch(`http://${host}/health`, {
        signal: controller.signal,
      }).catch(async () => {
        // Fallback to /api/v1/health
        return fetch(`http://${host}/api/v1/health`, {
          signal: controller.signal,
        });
      });
      clearTimeout(timeoutId);

      const roundTripMs = Date.now() - startTime;

      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        setHealth({
          status: data.status === "healthy" ? "healthy" : "degraded",
          service: data.service,
          database: data.database || {
            status: "connected",
            connected: true,
            type: "database",
          },
          latencyMs: roundTripMs,
        });
      } else {
        setHealth({
          status: "offline",
          error: `HTTP ${res?.status || "Unknown"}`,
        });
      }
    } catch (err: any) {
      setHealth({
        status: "offline",
        error: err?.message || "Unreachable",
      });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    // Poll every 15 seconds during dev
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  if (isDismissed) {
    // Show a tiny discreet floating toggle button in the bottom right corner
    return (
      <TouchableOpacity
        onPress={() => setIsDismissed(false)}
        style={styles.reopenBubble}
        activeOpacity={0.8}
      >
        <Text style={styles.reopenBubbleText}>
          {health.status === "healthy" ? "🟢" : "🔴"}
        </Text>
      </TouchableOpacity>
    );
  }

  const isConnected = health.status === "healthy";
  const dbConnected = health.database?.connected !== false && isConnected;
  const latencyDisplay = health.latencyMs ? `${health.latencyMs}ms` : "";

  return (
    <>
      {/* Floating Mini Pill */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={[
          styles.pillContainer,
          isConnected ? styles.pillConnected : styles.pillOffline,
        ]}
        activeOpacity={0.85}
      >
        <View
          style={[
            styles.statusDot,
            isConnected ? styles.dotGreen : styles.dotRed,
          ]}
        />
        <Text style={styles.pillText}>
          {checking ? (
            "Checking..."
          ) : isConnected ? (
            `BE: OK (${latencyDisplay}) • DB: ${
              health.database?.type || "pg"
            }`
          ) : (
            `BE: Offline (${getServerHost()})`
          )}
        </Text>
        <Text style={styles.pillDevTag}>DEV</Text>
      </TouchableOpacity>

      {/* Detailed Diagnostic Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View
                  style={[
                    styles.statusDot,
                    isConnected ? styles.dotGreen : styles.dotRed,
                  ]}
                />
                <Text style={styles.modalTitle}>Dev Connection Inspector</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Live synchronization telemetry between Mobile App, Backend API, and Database.
            </Text>

            {/* Diagnostics rows */}
            <View style={styles.diagSection}>
              <View style={styles.diagRow}>
                <Text style={styles.diagLabel}>Backend Host</Text>
                <Text style={styles.diagValue}>{getServerHost()}</Text>
              </View>

              <View style={styles.diagRow}>
                <Text style={styles.diagLabel}>API Base URL</Text>
                <Text style={[styles.diagValue, { fontSize: 11 }]}>{getBaseUrl()}</Text>
              </View>

              <View style={styles.diagRow}>
                <Text style={styles.diagLabel}>Backend API</Text>
                <Text
                  style={[
                    styles.diagValue,
                    isConnected ? styles.textGreen : styles.textRed,
                  ]}
                >
                  {isConnected ? "🟢 Connected" : `🔴 Offline (${health.error || "Unreachable"})`}
                </Text>
              </View>

              <View style={styles.diagRow}>
                <Text style={styles.diagLabel}>Database</Text>
                <Text
                  style={[
                    styles.diagValue,
                    dbConnected ? styles.textGreen : styles.textRed,
                  ]}
                >
                  {dbConnected
                    ? `🟢 ${health.database?.type?.toUpperCase() || "POSTGRESQL"} (Latency: ${
                        health.database?.latency_ms ?? health.latencyMs
                      }ms)`
                    : "🔴 Disconnected / Degraded"}
                </Text>
              </View>

              <View style={styles.diagDivider} />

              <View style={styles.diagRow}>
                <Text style={styles.diagLabel}>Logged User</Text>
                <Text style={styles.diagValue}>
                  {user?.name || "Guest"} ({user?.phone || "No Phone"})
                </Text>
              </View>

              <View style={styles.diagRow}>
                <Text style={styles.diagLabel}>Role & Unit</Text>
                <Text style={styles.diagValue}>
                  {user?.role?.toUpperCase()} • {user?.unitNumber || "No Unit"}
                </Text>
              </View>

              <View style={styles.diagRow}>
                <Text style={styles.diagLabel}>Society ID</Text>
                <Text style={[styles.diagValue, { fontSize: 10 }]} numberOfLines={1}>
                  {user?.societyId || "None"}
                </Text>
              </View>

              <View style={styles.diagRow}>
                <Text style={styles.diagLabel}>Token Header</Text>
                <Text style={[styles.diagValue, { fontSize: 11 }]}>
                  {token ? `${token.substring(0, 18)}...` : "None"}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={checkHealth}
                disabled={checking}
                style={styles.pingBtn}
                activeOpacity={0.8}
              >
                {checking ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.pingBtnText}>⚡ Ping Backend Now</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setIsDismissed(true);
                }}
                style={styles.hideBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.hideBtnText}>Hide Pill</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.devNote}>
              Note: This inspector is strictly dev-only (__DEV__ flag). It will be completely removed in production release builds.
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pillContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 30 : 16,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  pillConnected: {
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    borderColor: "rgba(16, 185, 129, 0.4)",
  },
  pillOffline: {
    backgroundColor: "rgba(239, 68, 68, 0.92)",
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dotGreen: {
    backgroundColor: "#10b981",
  },
  dotRed: {
    backgroundColor: "#ef4444",
  },
  pillText: {
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  pillDevTag: {
    marginLeft: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    color: "#94a3b8",
    fontSize: 9,
    fontWeight: "800",
  },
  reopenBubble: {
    position: "absolute",
    bottom: 24,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  reopenBubbleText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "800",
  },
  closeBtn: {
    color: "#94a3b8",
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 6,
  },
  modalSub: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 16,
  },
  diagSection: {
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  diagRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  diagLabel: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  diagValue: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "700",
    maxWidth: 240,
    textAlign: "right",
  },
  diagDivider: {
    height: 1,
    backgroundColor: "#334155",
    marginVertical: 4,
  },
  textGreen: {
    color: "#34d399",
  },
  textRed: {
    color: "#f87171",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  pingBtn: {
    flex: 1,
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pingBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  hideBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  hideBtnText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
  devNote: {
    color: "#64748b",
    fontSize: 10,
    textAlign: "center",
    marginTop: 14,
    lineHeight: 14,
  },
});
