import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "../../src/theme/colors";
import { useAuthStore } from "../../src/store/authStore";
import { useSyncStore, syncEngine } from "../../src/sync/syncEngine";
import { OfflineBanner } from "../../src/components/OfflineBanner";

export default function GuardConsoleScreen() {
  const router = useRouter();
  const [isOnDuty, setIsOnDuty] = useState(true);
  const { isOnline, pendingCount } = useSyncStore();

  useEffect(() => {
    syncEngine.init().catch(() => {});
  }, []);

  const toggleDuty = () => {
    if (isOnDuty) {
      Alert.alert("Duty Check-Out", "End your active shift at Main North Gate?", [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm Off-Duty", onPress: () => setIsOnDuty(false) },
      ]);
    } else {
      setIsOnDuty(true);
      Alert.alert("Checked In", "You are now active on duty at Main North Gate!");
    }
  };

  const toggleOfflineSimulation = () => {
    const nextState = !isOnline;
    useSyncStore.getState().setOnline(nextState);
    if (!nextState) {
      Alert.alert("⚡ Offline Mode Active", "All entries and gate mutations will be saved locally to SQLite queue.");
    } else {
      syncEngine.flushQueue().catch(() => {});
      Alert.alert("🔄 Online Mode", "Flushing queued operations to society server...");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />
      {/* Top Gate & Sync Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.gateInfo}>
          <Text style={styles.gateName}>Main North Gate</Text>
          <Text style={styles.terminalCode}>TERMINAL: GATE-01 • GreenWood Palms</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <TouchableOpacity
            onPress={() => {
              useAuthStore.getState().logout();
              router.replace("/(auth)/login");
            }}
            style={styles.logoutBtn}
          >
            <Text style={styles.logoutBtnText}>Exit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleOfflineSimulation}
            style={[styles.syncBadge, isOnline ? styles.syncOnline : styles.syncOffline]}
          >
            <View style={[styles.dot, isOnline ? styles.dotGreen : styles.dotAmber]} />
            <Text style={[styles.syncText, isOnline ? styles.syncTextOnline : styles.syncTextOffline]}>
              {isOnline ? (pendingCount > 0 ? `SYNC (${pendingCount})` : "ONLINE") : `OFFLINE (${pendingCount})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Guard Profile & Duty Toggle Card */}
        <View style={styles.dutyCard}>
          <View style={styles.guardRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>J</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.guardName}>Jagdish R.</Text>
              <Text style={styles.guardBadge}>Badge #SEC-101 • Morning Shift (06:00 - 14:00)</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={toggleDuty}
            style={[styles.dutyToggleBtn, isOnDuty ? styles.dutyOn : styles.dutyOff]}
          >
            <Text style={styles.dutyToggleText}>
              {isOnDuty ? "🟢 ON DUTY — Tap to Check-Out" : "⚪ OFF DUTY — Tap to Check-In"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Primary Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => router.push("/(guard)/scan")}
            style={[styles.bigActionBtn, { backgroundColor: Colors.primary }]}
          >
            <Text style={styles.bigEmoji}>📷</Text>
            <Text style={styles.bigActionTitle}>Scan QR Pass</Text>
            <Text style={styles.bigActionSub}>Instant Guest & Delivery Entry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(guard)/walk-in")}
            style={[styles.bigActionBtn, { backgroundColor: Colors.secondary }]}
          >
            <Text style={styles.bigEmoji}>📝</Text>
            <Text style={styles.bigActionTitle}>Walk-in Entry</Text>
            <Text style={styles.bigActionSub}>Unscheduled Guest / Partner</Text>
          </TouchableOpacity>
        </View>

        {/* Real-time Gate Statistics */}
        <Text style={styles.sectionTitle}>Today's Gate Traffic</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>48</Text>
            <Text style={styles.statLabel}>Checked-In Today</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>18</Text>
            <Text style={styles.statLabel}>Currently Inside</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>32</Text>
            <Text style={styles.statLabel}>Pre-approved Passes</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a", // Sleek dark mode for high-contrast security gate screens
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#1e293b",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  gateInfo: {
    flex: 1,
  },
  gateName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  terminalCode: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
    fontWeight: "600",
  },
  syncBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  syncOnline: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "#10b981",
  },
  syncOffline: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderColor: "#f59e0b",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotGreen: {
    backgroundColor: "#10b981",
  },
  dotAmber: {
    backgroundColor: "#f59e0b",
  },
  syncText: {
    fontSize: 10,
    fontWeight: "800",
  },
  syncTextOnline: {
    color: "#10b981",
  },
  syncTextOffline: {
    color: "#f59e0b",
  },
  logoutBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  logoutBtnText: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "700",
  },
  content: {
    padding: 20,
    gap: 20,
  },
  dutyCard: {
    backgroundColor: "#1e293b",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 14,
  },
  guardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },
  guardName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  guardBadge: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },
  dutyToggleBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  dutyOn: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderWidth: 1,
    borderColor: "#10b981",
  },
  dutyOff: {
    backgroundColor: "#334155",
  },
  dutyToggleText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
  actionRow: {
    gap: 12,
  },
  bigActionBtn: {
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  bigEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  bigActionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },
  bigActionSub: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  statTile: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
  },
  statLabel: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 4,
    textAlign: "center",
    fontWeight: "600",
  },
});
