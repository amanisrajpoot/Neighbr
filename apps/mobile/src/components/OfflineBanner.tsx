import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSyncStore, syncEngine } from "../sync/syncEngine";
import { Colors } from "../theme/colors";

export const OfflineBanner: React.FC = () => {
  const { isOnline, isSyncing, pendingCount } = useSyncStore();

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null; // Don't clutter the UI when everything is in sync
  }

  const handleManualSync = () => {
    syncEngine.flushQueue().catch(() => {});
  };

  return (
    <View style={[styles.container, !isOnline ? styles.offlineBg : styles.syncingBg]}>
      <View style={styles.content}>
        <Text style={styles.icon}>{!isOnline ? "⚡" : "🔄"}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {!isOnline
              ? `Offline Mode • ${pendingCount} local ${pendingCount === 1 ? "entry" : "entries"} saved`
              : isSyncing
              ? "Synchronizing local operations..."
              : `${pendingCount} entries ready to sync`}
          </Text>
          <Text style={styles.sub}>
            {!isOnline
              ? "All gate actions will sync automatically once reconnected."
              : "Connecting securely to society server"}
          </Text>
        </View>
      </View>

      {isSyncing ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <TouchableOpacity onPress={handleManualSync} style={styles.syncButton}>
          <Text style={styles.syncButtonText}>Sync</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  offlineBg: {
    backgroundColor: "#d97706", // Amber 600
  },
  syncingBg: {
    backgroundColor: Colors.primary,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  icon: {
    fontSize: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
  },
  sub: {
    fontSize: 10,
    color: "rgba(255,255,255,0.85)",
    marginTop: 1,
  },
  syncButton: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  syncButtonText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
});
