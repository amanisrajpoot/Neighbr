import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "../../src/theme/colors";
import { usePasses, VisitorPassItem } from "../../src/hooks/usePasses";
import { useAuthStore } from "../../src/store/authStore";
import { QRCodeView } from "../../src/components/QRCodeView";
import { QueryErrorView } from "../../src/components/QueryErrorView";

export default function ResidentVisitorsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { passes, isLoading, isError, error, refetch, revokePass, isRevoking, approvePass, rejectPass, isApproving, isRejecting } = usePasses();
  const [activeFilter, setActiveFilter] = useState<"ALL" | "PENDING" | "ACTIVE" | "PAST">("ALL");
  const [selectedPass, setSelectedPass] = useState<VisitorPassItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const pendingPassesCount = passes.filter((p) => p.status === "APPROVAL_PENDING" || p.status === "WAITING_APPROVAL").length;

  const filteredPasses = passes.filter((p: VisitorPassItem) => {
    if (activeFilter === "PENDING") return p.status === "APPROVAL_PENDING" || p.status === "WAITING_APPROVAL";
    if (activeFilter === "ACTIVE") return p.status === "APPROVED" || p.status === "CHECKED_IN";
    if (activeFilter === "PAST") return ["CHECKED_OUT", "EXPIRED", "REJECTED", "CANCELLED"].includes(p.status);
    return true;
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleApproveFromList = async (id: string) => {
    try {
      await approvePass(id);
      await refetch();
      if (selectedPass?.id === id) setSelectedPass(null);
    } catch (e: any) {
      alert("Approval Failed: " + (e?.message || "Could not approve pass."));
    }
  };

  const handleRejectFromList = async (id: string) => {
    try {
      await rejectPass(id);
      await refetch();
      if (selectedPass?.id === id) setSelectedPass(null);
    } catch (e: any) {
      alert("Decline Failed: " + (e?.message || "Could not decline pass."));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Visitor Passes</Text>
          <Text style={styles.subtitle}>Pre-approved gate passes & entry PINs</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(resident)/create-pass")}
          style={styles.newPassButton}
        >
          <Text style={styles.newPassButtonText}>+ New Pass</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(["ALL", "PENDING", "ACTIVE", "PAST"] as const).map((tab) => {
          const isSelected = activeFilter === tab;
          let label = tab === "ALL" ? `All (${passes.length})` : tab === "PENDING" ? `Pending (${pendingPassesCount})` : tab === "ACTIVE" ? "Active / Inside" : "Past History";
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveFilter(tab)}
              style={[
                styles.filterTab,
                isSelected && styles.filterTabActive,
                tab === "PENDING" && pendingPassesCount > 0 && !isSelected && styles.filterTabPendingAlert,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  isSelected && styles.filterTextActive,
                  tab === "PENDING" && pendingPassesCount > 0 && !isSelected && styles.filterTextPendingAlert,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredPasses.length > 0 ? (
          filteredPasses.map((pass) => {
            const isApproved = pass.status === "APPROVED" || pass.status === "CHECKED_IN";
            const isPending = pass.status === "APPROVAL_PENDING" || pass.status === "WAITING_APPROVAL";
            return (
              <TouchableOpacity
                key={pass.id}
                style={[styles.card, isPending && styles.cardPendingBorder]}
                activeOpacity={0.85}
                onPress={() => setSelectedPass(pass)}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.visitorName}>{pass.visitor_name}</Text>
                    <Text style={styles.visitorMeta}>
                      {pass.pass_type?.toUpperCase()} • {pass.valid_from ? pass.valid_from.slice(0, 16).replace("T", " ") : "Valid Today"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      isPending ? styles.statusPending : isApproved ? styles.statusSuccess : styles.statusMuted,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        isPending ? styles.statusTextPending : isApproved ? styles.statusTextSuccess : styles.statusTextMuted,
                      ]}
                    >
                      ● {isPending ? "APPROVAL PENDING" : pass.status}
                    </Text>
                  </View>
                </View>

                {/* Quick Card Action Buttons for Pending Passes */}
                {isPending && (
                  <View style={styles.cardQuickActions}>
                    <TouchableOpacity
                      style={styles.cardApproveBtn}
                      disabled={isApproving}
                      onPress={() => handleApproveFromList(pass.id)}
                    >
                      <Text style={styles.cardApproveBtnText}>{isApproving ? "Approving..." : "✓ Approve Entry"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cardDeclineBtn}
                      disabled={isRejecting}
                      onPress={() => handleRejectFromList(pass.id)}
                    >
                      <Text style={styles.cardDeclineBtnText}>{isRejecting ? "Declining..." : "✕ Decline"}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Clean Pass Details */}
                <View style={styles.cardFooter}>
                  <View style={styles.pinTag}>
                    <Text style={styles.pinTagLabel}>ENTRY PIN</Text>
                    <Text style={styles.pinTagValue}>{pass.pass_code || "889922"}</Text>
                  </View>
                  <Text style={styles.viewPassLink}>Show QR Pass →</Text>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🎟️</Text>
            <Text style={styles.emptyTitle}>No Visitor Passes Found</Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === "PENDING"
                ? "No pending approvals right now. When a walk-in visitor arrives, you can approve them here."
                : activeFilter === "ACTIVE"
                ? "No active visitor passes right now. Pre-approve a guest or delivery."
                : "Create a visitor pass to share a digital QR & PIN with your guests."}
            </Text>
            <TouchableOpacity
              style={styles.emptyCreateBtn}
              onPress={() => router.push("/(resident)/create-pass")}
            >
              <Text style={styles.emptyCreateText}>+ Generate New Pass</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Selected Pass View Modal */}
      {selectedPass && (
        <Modal visible={Boolean(selectedPass)} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Authorized Digital Pass</Text>
                <TouchableOpacity onPress={() => setSelectedPass(null)} style={styles.modalClose}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <QRCodeView
                value={selectedPass.qr_token}
                pinCode={selectedPass.pass_code || "889922"}
                visitorName={selectedPass.visitor_name}
                unitNumber={user?.unitNumber || "Villa-42"}
                validUntil={selectedPass.valid_until ? selectedPass.valid_until.slice(0, 16).replace("T", " ") : "Today, 11:59 PM"}
                status={selectedPass.status}
                showShareButton={true}
              />

              {/* Pending Approval Primary Actions in Modal */}
              {(selectedPass.status === "APPROVAL_PENDING" || selectedPass.status === "WAITING_APPROVAL") ? (
                <View style={{ width: "100%", gap: 8, marginTop: 14 }}>
                  <TouchableOpacity
                    style={[styles.modalApproveBtn, isApproving && { opacity: 0.6 }]}
                    disabled={isApproving}
                    onPress={() => handleApproveFromList(selectedPass.id)}
                  >
                    <Text style={styles.modalApproveBtnText}>{isApproving ? "Approving Entry..." : "✓ Approve Entry Pass"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalDeclineBtn, isRejecting && { opacity: 0.6 }]}
                    disabled={isRejecting}
                    onPress={() => handleRejectFromList(selectedPass.id)}
                  >
                    <Text style={styles.modalDeclineBtnText}>{isRejecting ? "Declining..." : "✕ Decline Entry"}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                  {["APPROVED", "CREATED"].includes(selectedPass.status) && (
                    <TouchableOpacity
                      style={[styles.revokeButton, isRevoking && { opacity: 0.6 }]}
                      disabled={isRevoking}
                      onPress={async () => {
                        try {
                          await revokePass(selectedPass.id);
                          setSelectedPass(null);
                        } catch (e: any) {
                          alert("Revocation Failed: " + (e?.message || "Could not revoke pass."));
                        }
                      }}
                    >
                      <Text style={styles.revokeButtonText}>{isRevoking ? "Revoking..." : "Revoke Pass"}</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={[styles.doneButton, { flex: 1, marginTop: 0 }]} onPress={() => setSelectedPass(null)}>
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const extraStyles = StyleSheet.create({
  revokeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  revokeBtnText: {
    color: "#dc2626",
    fontWeight: "700",
    fontSize: 14,
  },
});


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
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  newPassButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  newPassButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  filterRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  filterTextActive: {
    color: "#ffffff",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  visitorName: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  visitorMeta: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 3,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusSuccess: {
    backgroundColor: "#ecfdf5",
  },
  statusMuted: {
    backgroundColor: "#f1f5f9",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  statusTextSuccess: {
    color: "#059669",
  },
  statusTextMuted: {
    color: "#64748b",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  pinTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 6,
  },
  pinTagLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748b",
  },
  pinTagValue: {
    fontSize: 13,
    fontWeight: "900",
    fontFamily: "monospace",
    color: Colors.primaryDark,
    letterSpacing: 1,
  },
  viewPassLink: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primary,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyEmoji: {
    fontSize: 42,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  emptyCreateBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
  },
  emptyCreateText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  modalClose: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 16,
    color: "#94a3b8",
    fontWeight: "800",
  },
  doneButton: {
    backgroundColor: "#f1f5f9",
    width: "100%",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 14,
  },
  doneButtonText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "800",
  },
  revokeButton: {
    backgroundColor: "#fee2e2",
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  revokeButtonText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "800",
  },
  cardPendingBorder: {
    borderColor: "#f59e0b",
    borderWidth: 1.5,
  },
  statusPending: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderColor: "#f59e0b",
  },
  statusTextPending: {
    color: "#d97706",
  },
  filterTabPendingAlert: {
    borderColor: "#f59e0b",
    borderWidth: 1,
    backgroundColor: "rgba(245, 158, 11, 0.08)",
  },
  filterTextPendingAlert: {
    color: "#d97706",
    fontWeight: "800",
  },
  cardQuickActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  cardApproveBtn: {
    flex: 1,
    backgroundColor: "#10b981",
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  cardApproveBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  cardDeclineBtn: {
    flex: 1,
    backgroundColor: "#fee2e2",
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  cardDeclineBtnText: {
    color: "#dc2626",
    fontSize: 12,
    fontWeight: "800",
  },
  modalApproveBtn: {
    backgroundColor: "#10b981",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
  },
  modalApproveBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  modalDeclineBtn: {
    backgroundColor: "#fee2e2",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
  },
  modalDeclineBtnText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "800",
  },
});

