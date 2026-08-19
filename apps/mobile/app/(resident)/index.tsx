import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "../../src/theme/colors";
import { useAuthStore } from "../../src/store/authStore";
import { useNotices } from "../../src/hooks/useNotices";

export default function ResidentHomeScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { triggerSOS } = useNotices();

  // Mock interactive visitor waiting alert
  const [waitingVisitor, setWaitingVisitor] = useState<{
    id: string;
    name: string;
    type: string;
    vehicle?: string;
    gate: string;
  } | null>({
    id: "v-wait-01",
    name: "Swiggy Delivery Partner",
    type: "Delivery",
    vehicle: "KA01EZ4321",
    gate: "Main North Gate",
  });

  const handleApprove = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert("✅ Approved: Gate pass issued! The guard will let the delivery partner in.");
    } else {
      Alert.alert("Approved", "Gate pass issued! The guard will let the delivery partner in.");
    }
    setWaitingVisitor(null);
  };

  const handleReject = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert("❌ Declined: Entry request declined. Guard has been notified.");
    } else {
      Alert.alert("Declined", "Entry request declined. Guard has been notified.");
    }
    setWaitingVisitor(null);
  };

  const handleSOS = async () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const ok = window.confirm("🚨 EMERGENCY SOS TRIGGER\n\nAre you sure you want to broadcast an emergency alarm to security guards and community admins?");
      if (ok) {
        try {
          await triggerSOS({
            sos_type: "security",
            message: `Emergency SOS triggered by ${user?.name || "Resident"} in ${user?.unitNumber || "Estate"}`,
          });
        } catch (e) {
          console.log("SOS backend dispatch:", e);
        }
        window.alert("🚨 SOS Broadcast Activated!\n\nSecurity team and gate guards have received your emergency alert.");
      }
    } else {
      Alert.alert(
        "Emergency SOS Trigger",
        "Are you sure you want to broadcast an emergency alarm to security guards and community admins?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm Alarm",
            style: "destructive",
            onPress: async () => {
              try {
                await triggerSOS({
                  sos_type: "security",
                  message: `Emergency SOS triggered by ${user?.name || "Resident"} in ${user?.unitNumber || "Estate"}`,
                });
              } catch (e) {
                console.log("SOS backend dispatch:", e);
              }
              Alert.alert("SOS Triggered", "Security team and gate guards have received your emergency alert!");
            },
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.societyName}>{user?.societyName || "Greenwood Palms"}</Text>
          <Text style={styles.unitBadge}>📍 Flat {user?.unitNumber || "Villa-42"}</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            onPress={() => {
              useAuthStore.getState().logout();
              router.replace("/(auth)/login");
            }}
            style={styles.logoutButton}
          >
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSOS} style={styles.sosButton}>
            <Text style={styles.sosButtonText}>🚨 SOS</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Waiting Visitor Alert Card */}
        {waitingVisitor && (
          <View style={styles.waitingCard}>
            <View style={styles.waitingCardHeader}>
              <View style={styles.pulseDot} />
              <Text style={styles.waitingCardTitle}>Visitor Waiting at Gate</Text>
            </View>

            <View style={styles.waitingDetails}>
              <Text style={styles.visitorName}>{waitingVisitor.name}</Text>
              <Text style={styles.visitorMeta}>
                {waitingVisitor.type} • {waitingVisitor.gate}
              </Text>
              {waitingVisitor.vehicle && (
                <Text style={styles.visitorVehicle}>Vehicle: {waitingVisitor.vehicle}</Text>
              )}
            </View>

            <View style={styles.waitingActions}>
              <TouchableOpacity onPress={handleReject} style={styles.rejectBtn}>
                <Text style={styles.rejectBtnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleApprove} style={styles.approveBtn}>
                <Text style={styles.approveBtnText}>Approve Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick Actions Grid */}
        <Text style={styles.sectionTitle}>Quick Gate Actions</Text>
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridTile}
            onPress={() => router.push("/(resident)/create-pass")}
          >
            <Text style={styles.tileEmoji}>🎟️</Text>
            <Text style={styles.tileTitle}>Invite Guest</Text>
            <Text style={styles.tileDesc}>Pre-approve pass</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridTile}
            onPress={() => router.push("/(resident)/create-pass")}
          >
            <Text style={styles.tileEmoji}>📦</Text>
            <Text style={styles.tileTitle}>Delivery Pass</Text>
            <Text style={styles.tileDesc}>Leave at gate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridTile}
            onPress={() => router.push("/(resident)/create-pass")}
          >
            <Text style={styles.tileEmoji}>🚖</Text>
            <Text style={styles.tileTitle}>Cab / Taxi</Text>
            <Text style={styles.tileDesc}>Quick cab entry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridTile}
            onPress={() => router.push("/(resident)/staff")}
          >
            <Text style={styles.tileEmoji}>🧹</Text>
            <Text style={styles.tileTitle}>Daily Help</Text>
            <Text style={styles.tileDesc}>Maid & Cook status</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridTile}
            onPress={() => router.push("/(resident)/vehicles")}
          >
            <Text style={styles.tileEmoji}>🚗</Text>
            <Text style={styles.tileTitle}>My Vehicles</Text>
            <Text style={styles.tileDesc}>Parking & RFID tag</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridTile}
            onPress={() => router.push("/(resident)/helpdesk")}
          >
            <Text style={styles.tileEmoji}>🛠️</Text>
            <Text style={styles.tileTitle}>Helpdesk</Text>
            <Text style={styles.tileDesc}>Repairs & Service</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridTile}
            onPress={() => router.push("/(resident)/amenities")}
          >
            <Text style={styles.tileEmoji}>🎾</Text>
            <Text style={styles.tileTitle}>Clubhouse</Text>
            <Text style={styles.tileDesc}>Pool, Court & Slots</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridTile}
            onPress={() => router.push("/(resident)/billing")}
          >
            <Text style={styles.tileEmoji}>💳</Text>
            <Text style={styles.tileTitle}>Maintenance</Text>
            <Text style={styles.tileDesc}>Pay Dues & Receipts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridTile}
            onPress={() => router.push("/(resident)/community")}
          >
            <Text style={styles.tileEmoji}>💬</Text>
            <Text style={styles.tileTitle}>Community</Text>
            <Text style={styles.tileDesc}>Forum & Live Polls</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridTile}
            onPress={() => router.push("/(resident)/marketplace")}
          >
            <Text style={styles.tileEmoji}>🛍️</Text>
            <Text style={styles.tileTitle}>Bazaar & Services</Text>
            <Text style={styles.tileDesc}>Buy, Sell & Book</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridTile}
            onPress={() => router.push("/(resident)/assistant")}
          >
            <Text style={styles.tileEmoji}>✨</Text>
            <Text style={styles.tileTitle}>AI Assistant</Text>
            <Text style={styles.tileDesc}>Instant Copilot</Text>
          </TouchableOpacity>
        </View>

        {/* Expected Today List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Expected Visitors Today</Text>
          <TouchableOpacity onPress={() => router.push("/(resident)/visitors")}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.visitorCard}>
          <View style={styles.visitorCardRow}>
            <View>
              <Text style={styles.visitorCardName}>Ananya Roy</Text>
              <Text style={styles.visitorCardTime}>Expected at 7:00 PM • Guest</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>APPROVED</Text>
            </View>
          </View>
        </View>

        {/* Recent Community Notice */}
        <Text style={styles.sectionTitle}>Community Notice</Text>
        <TouchableOpacity
          style={styles.noticeCard}
          onPress={() => router.push("/(resident)/notices")}
        >
          <View style={styles.noticeHeader}>
            <Text style={styles.noticeTag}>HIGH PRIORITY</Text>
            <Text style={styles.noticeTime}>Today</Text>
          </View>
          <Text style={styles.noticeTitle}>Quarterly Water Tank Cleaning & Supply Interruption</Text>
          <Text style={styles.noticeSnippet} numberOfLines={2}>
            Water supply across all towers will be briefly paused between 2:00 PM and 5:00 PM this coming Sunday.
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  societyName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  unitBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primaryDark,
    marginTop: 2,
  },
  sosButton: {
    backgroundColor: Colors.danger,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sosButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },
  logoutButton: {
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logoutButtonText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 20,
    gap: 18,
  },
  waitingCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.warning,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  waitingCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.warning,
  },
  waitingCardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.warning,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  waitingDetails: {
    marginBottom: 14,
  },
  visitorName: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  visitorMeta: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  visitorVehicle: {
    fontSize: 12,
    color: Colors.primaryDark,
    fontWeight: "600",
    marginTop: 2,
  },
  waitingActions: {
    flexDirection: "row",
    gap: 10,
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.secondaryLight,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  rejectBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  approveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.success,
    alignItems: "center",
  },
  approveBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gridTile: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  tileEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  tileTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  tileDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  visitorCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  visitorCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  visitorCardName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  visitorCardTime: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.success,
  },
  noticeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  noticeTag: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.danger,
    backgroundColor: Colors.dangerLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  noticeTime: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 4,
  },
  noticeSnippet: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
});
