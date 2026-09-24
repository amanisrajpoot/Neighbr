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
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "../../src/theme/colors";
import { useAuthStore } from "../../src/store/authStore";
import { useNotices } from "../../src/hooks/useNotices";
import { usePasses } from "../../src/hooks/usePasses";
import { useStaff } from "../../src/hooks/useStaff";
import { useAmenities } from "../../src/hooks/useAmenities";
import { OfflineBanner } from "../../src/components/OfflineBanner";
import { QueryErrorView } from "../../src/components/QueryErrorView";

export default function ResidentHomeScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { notices, triggerSOS, isError: isErrorNotices, error: errorNotices, refetch: refetchNotices } = useNotices();
  const { passes, approvePass, rejectPass, refetch: refetchPasses } = usePasses();
  const { unitStaff, isErrorUnitStaff, errorUnitStaff, refetchUnitStaff } = useStaff();
  const { myBookings, isErrorBookings, errorBookings, refetchBookings } = useAmenities();

  const [dismissedVisitorIds, setDismissedVisitorIds] = useState<string[]>([]);
  const [viewAllVisible, setViewAllVisible] = useState(false);

  // Live waiting visitor (waiting approval) from real passes query
  const pendingPass = passes.find(
    (p) => p.status === "WAITING_APPROVAL" && !dismissedVisitorIds.includes(p.id)
  );

  const activeWaitingVisitor = pendingPass
    ? {
        id: pendingPass.id,
        name: pendingPass.visitor_name || "Visitor at Gate",
        type: pendingPass.pass_type || "Guest",
        vehicle: pendingPass.vehicle_number || "Pedestrian",
        gate: "Main Security Gate",
      }
    : null;

  const handleApprove = async (id: string) => {
    setDismissedVisitorIds((prev) => [...prev, id]);
    try {
      await approvePass(id);
      await refetchPasses();
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert("✅ Approved: Gate pass issued! Guard has been signaled to grant entry.");
      } else {
        Alert.alert("Approved", "Gate pass issued! Guard has been signaled to grant entry.");
      }
    } catch (e: any) {
      Alert.alert("Approval Failed", e?.message || "Could not approve pass on server.");
    }
  };

  const handleReject = async (id: string) => {
    setDismissedVisitorIds((prev) => [...prev, id]);
    try {
      await rejectPass(id);
      await refetchPasses();
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert("❌ Declined: Entry request declined. Guard notified.");
      } else {
        Alert.alert("Declined", "Entry request declined. Guard notified.");
      }
    } catch (e: any) {
      Alert.alert("Decline Failed", e?.message || "Could not decline pass on server.");
    }
  };

  const handleSOS = async () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const ok = window.confirm(
        "🚨 EMERGENCY SOS TRIGGER\n\nAre you sure you want to broadcast an emergency alarm to security guards and community admins?"
      );
      if (ok) {
        try {
          await triggerSOS({
            sos_type: "security",
            message: `Emergency SOS triggered by ${user?.name || "Resident"} in ${user?.unitNumber || "Villa-42"}`,
          });
          window.alert("🚨 SOS Broadcast Activated!\n\nSecurity team and gate guards have received your emergency alert.");
        } catch (e: any) {
          window.alert(`⚠️ SOS Alert Failed: ${e?.message || "Could not broadcast emergency alarm. Call security immediately!"}`);
        }
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
                  message: `Emergency SOS triggered by ${user?.name || "Resident"} in ${user?.unitNumber || "Villa-42"}`,
                });
                Alert.alert("SOS Triggered", "Security team and gate guards have received your emergency alert!");
              } catch (e: any) {
                Alert.alert(
                  "SOS Alert Failed",
                  e?.message || "Could not broadcast emergency alarm to guards. Please contact security directly!"
                );
              }
            },
          },
        ]
      );
    }
  };

  // 6 Primary Quick Actions (3x2 Grid)
  const primaryActions = [
    { id: "guest", label: "Guest Pass", icon: "⚡", color: "#38bdf8", route: "/(resident)/create-pass?type=guest" },
    { id: "delivery", label: "Delivery Entry", icon: "📦", color: "#fb923c", route: "/(resident)/create-pass?type=delivery" },
    { id: "cab", label: "Cab / Taxi", icon: "🚖", color: "#facc15", route: "/(resident)/create-pass?type=cab" },
    { id: "helpdesk", label: "Service & Repairs", icon: "🛠️", color: "#a855f7", route: "/(resident)/helpdesk" },
    { id: "staff", label: "Daily Help", icon: "🧹", color: "#ec4899", route: "/(resident)/staff" },
    { id: "amenities", label: "Clubhouse", icon: "🏊", color: "#10b981", route: "/(resident)/amenities" },
  ];

  // Full 12 Operational Services for View All Modal
  const allServices = [
    ...primaryActions,
    { id: "notices", label: "Society Notices", icon: "📜", color: "#6366f1", route: "/(resident)/notices" },
    { id: "community", label: "Community Forum", icon: "💬", color: "#0ea5e9", route: "/(resident)/community" },
    { id: "marketplace", label: "Marketplace", icon: "🛍️", color: "#14b8a6", route: "/(resident)/marketplace" },
    { id: "vehicles", label: "My Vehicles", icon: "🚗", color: "#8b5cf6", route: "/(resident)/vehicles" },
    { id: "billing", label: "Flat Dues & Dues", icon: "💳", color: "#059669", route: "/(resident)/billing" },
    { id: "assistant", label: "AI Copilot", icon: "🤖", color: "#f43f5e", route: "/(resident)/assistant" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <OfflineBanner />

      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.societyName}>{user?.societyName || "Greenwood Palms Heights"}</Text>
          <Text style={styles.unitBadge}>📍 Flat {user?.unitNumber || "Villa-42"}</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
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
        {/* 1. Critical Live Alert: Waiting at Gate */}
        {activeWaitingVisitor && (
          <View style={styles.waitingCard}>
            <View style={styles.waitingBadge}>
              <Text style={styles.waitingBadgeText}>🔔 WAITING AT GATE</Text>
            </View>

            <View style={styles.waitingInfo}>
              <Text style={styles.waitingTitle}>{activeWaitingVisitor.name}</Text>
              <Text style={styles.waitingSub}>
                {activeWaitingVisitor.type} • Vehicle: {activeWaitingVisitor.vehicle} • {activeWaitingVisitor.gate}
              </Text>
            </View>

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                onPress={() => handleReject(activeWaitingVisitor.id)}
                style={styles.rejectButton}
              >
                <Text style={styles.rejectButtonText}>✕ Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleApprove(activeWaitingVisitor.id)}
                style={styles.approveButton}
              >
                <Text style={styles.approveButtonText}>✓ Allow Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 2. Quick Gate Actions Header + View All Button */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Gate Actions</Text>
          <TouchableOpacity onPress={() => setViewAllVisible(true)} style={styles.viewAllBtn}>
            <Text style={styles.viewAllBtnText}>View All (12) →</Text>
          </TouchableOpacity>
        </View>

        {/* 3. 6 Primary Actions (3x2 Grid) */}
        <View style={styles.quickGrid}>
          {primaryActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              onPress={() => router.push(action.route as any)}
              style={styles.actionCard}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: action.color + "18" }]}>
                <Text style={styles.actionIcon}>{action.icon}</Text>
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 4. Today's Domestic Staff Status */}
        <View style={styles.cardSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily Domestic Help</Text>
            <TouchableOpacity onPress={() => router.push("/(resident)/staff")}>
              <Text style={styles.linkText}>Manage Staff ({unitStaff.length})</Text>
            </TouchableOpacity>
          </View>

          {isErrorUnitStaff ? (
            <QueryErrorView
              compact
              error={errorUnitStaff}
              message="Failed to load domestic staff."
              onRetry={refetchUnitStaff}
            />
          ) : unitStaff.length > 0 ? (
            unitStaff.slice(0, 2).map((item, idx) => (
              <View key={item.id || idx} style={styles.staffCard}>
                <View style={styles.staffLeft}>
                  <Text style={styles.staffAvatar}>👩‍🍳</Text>
                  <View>
                    <Text style={styles.staffName}>{item.staff?.name || "Domestic Help"}</Text>
                    <Text style={styles.staffRole}>{item.role || item.staff?.role || "House Help"} • {item.staff?.status === "INSIDE" ? "Inside Society" : "On Duty"}</Text>
                  </View>
                </View>
                <View style={styles.checkedInBadge}>
                  <Text style={styles.checkedInText}>{item.staff?.last_entry || "Linked"}</Text>
                </View>
              </View>
            ))
          ) : (
            <TouchableOpacity onPress={() => router.push("/(resident)/staff")} style={styles.emptyCard}>
              <Text style={styles.emptyCardIcon}>🧹</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.emptyCardTitle}>No Domestic Help Linked</Text>
                <Text style={styles.emptyCardSub}>Tap to browse society directory and link your maid, cook, or driver.</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* 5. Upcoming Amenity Bookings */}
        <View style={styles.cardSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
            <TouchableOpacity onPress={() => router.push("/(resident)/amenities")}>
              <Text style={styles.linkText}>Book Slot</Text>
            </TouchableOpacity>
          </View>

          {isErrorBookings ? (
            <QueryErrorView
              compact
              error={errorBookings}
              message="Failed to load upcoming bookings."
              onRetry={refetchBookings}
            />
          ) : myBookings.length > 0 ? (
            myBookings.slice(0, 2).map((b) => (
              <TouchableOpacity key={b.id} onPress={() => router.push("/(resident)/amenities")} style={styles.amenityCard}>
                <View style={styles.amenityLeft}>
                  <Text style={styles.amenityIcon}>🏊</Text>
                  <View>
                    <Text style={styles.amenityTitle}>{b.amenity_name || "Clubhouse Facility"}</Text>
                    <Text style={styles.amenityTime}>{b.booking_date} • {b.start_time} - {b.end_time}</Text>
                  </View>
                </View>
                <View style={styles.confirmedBadge}>
                  <Text style={styles.confirmedText}>● {b.status}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <TouchableOpacity onPress={() => router.push("/(resident)/amenities")} style={styles.emptyCard}>
              <Text style={styles.emptyCardIcon}>🎾</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.emptyCardTitle}>No Active Reservations</Text>
                <Text style={styles.emptyCardSub}>Tap to book swimming pool, tennis court, or party hall.</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* 6. Society Notice Broadcast Carousel */}
        <View style={styles.cardSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Society Notices & News</Text>
            <TouchableOpacity onPress={() => router.push("/(resident)/notices")}>
              <Text style={styles.linkText}>View Board</Text>
            </TouchableOpacity>
          </View>

          {isErrorNotices ? (
            <QueryErrorView
              compact
              error={errorNotices}
              message="Failed to load society notices."
              onRetry={refetchNotices}
            />
          ) : notices.length > 0 ? (
            <TouchableOpacity onPress={() => router.push("/(resident)/notices")} style={styles.noticeCard}>
              <View style={styles.noticeTag}>
                <Text style={styles.noticeTagText}>📢 OFFICIAL BROADCAST • {notices[0].priority.toUpperCase()}</Text>
              </View>
              <Text style={styles.noticeTitle}>{notices[0].title}</Text>
              <Text style={styles.noticeBody} numberOfLines={2}>
                {notices[0].body}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardIcon}>📜</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.emptyCardTitle}>All Clear</Text>
                <Text style={styles.emptyCardSub}>No active urgent notices published.</Text>
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* View All Services Full Modal */}
      <Modal
        visible={viewAllVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setViewAllVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>All Estate Services & Hub</Text>
              <Text style={styles.modalSubtitle}>12 integrated community lifestyle modules</Text>
            </View>
            <TouchableOpacity onPress={() => setViewAllVisible(false)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.allServicesGrid}>
            {allServices.map((service) => (
              <TouchableOpacity
                key={service.id}
                onPress={() => {
                  setViewAllVisible(false);
                  router.push(service.route as any);
                }}
                style={styles.fullServiceCard}
                activeOpacity={0.7}
              >
                <View style={[styles.fullServiceIconCircle, { backgroundColor: service.color + "18" }]}>
                  <Text style={styles.fullServiceIcon}>{service.icon}</Text>
                </View>
                <Text style={styles.fullServiceLabel}>{service.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  societyName: {
    fontSize: 17,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: -0.3,
  },
  unitBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
    marginTop: 2,
  },
  logoutButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  logoutButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  sosButton: {
    backgroundColor: "#ef4444",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sosButtonText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 13,
  },
  scrollContent: {
    padding: 18,
  },
  waitingCard: {
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#f59e0b",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  waitingBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  waitingBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#b45309",
  },
  waitingInfo: {
    marginBottom: 14,
  },
  waitingTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.text,
  },
  waitingSub: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 3,
    fontWeight: "500",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "#fee2e2",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  rejectButtonText: {
    color: "#b91c1c",
    fontWeight: "800",
    fontSize: 14,
  },
  approveButton: {
    flex: 1.5,
    backgroundColor: "#10b981",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  approveButtonText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  viewAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  viewAllBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.primary,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    width: "31%",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  actionIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center",
  },
  cardSection: {
    marginBottom: 20,
  },
  staffCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  staffLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  staffAvatar: {
    fontSize: 28,
  },
  staffName: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },
  staffRole: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  checkedInBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  checkedInText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#15803d",
  },
  amenityCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  amenityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  amenityIcon: {
    fontSize: 28,
  },
  amenityTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },
  amenityTime: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  confirmedBadge: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  confirmedText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0369a1",
  },
  noticeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  noticeTag: {
    alignSelf: "flex-start",
    backgroundColor: "#ede9fe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  noticeTagText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#6d28d9",
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 4,
  },
  noticeBody: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "600",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  allServicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 20,
    gap: 16,
  },
  fullServiceCard: {
    width: "30%",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  fullServiceIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  fullServiceIcon: {
    fontSize: 24,
  },
  fullServiceLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center",
  },
  emptyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  emptyCardIcon: {
    fontSize: 24,
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.text,
  },
  emptyCardSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
});
