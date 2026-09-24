import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  RefreshControl,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../src/theme/colors";
import { useNotices, NoticeItem, EmergencyContactItem } from "../../src/hooks/useNotices";
import { QueryErrorView } from "../../src/components/QueryErrorView";

export default function ResidentNoticesScreen() {
  const { notices, emergencyContacts, isLoading, isError, error, refetch, refetchContacts } = useNotices();
  const [activeTab, setActiveTab] = useState<"notices" | "emergency">("notices");
  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchContacts()]);
    setRefreshing(false);
  };

  const handleCall = (phone: string) => {
    const clean = phone.replace(/[^0-9+]/g, "");
    if (Platform.OS === "web") {
      window.open(`tel:${clean}`);
    } else {
      Linking.openURL(`tel:${clean}`).catch(() => {
        alert(`Contact number: ${clean}`);
      });
    }
  };

  const defaultContacts = emergencyContacts.length > 0 ? emergencyContacts : [
    { id: "em-1", society_id: "", name: "Main Security Gate", phone: "+91 98765 30003", designation: "Gate Security Console", is_active: true },
    { id: "em-2", society_id: "", name: "Estate Facility Office", phone: "+91 98765 00001", designation: "Society Administration", is_active: true },
    { id: "em-3", society_id: "", name: "Emergency Fire Response", phone: "101", designation: "Fire & Rescue Station", is_active: true },
    { id: "em-4", society_id: "", name: "Emergency Ambulance", phone: "108", designation: "Trauma Care Ambulances", is_active: true },
    { id: "em-5", society_id: "", name: "Electrician On-Call", phone: "+91 98765 41103", designation: "Society Maintenance Team", is_active: true },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Society Communications</Text>
          <Text style={styles.subtitle}>Official Bulletins & Emergency Speed-Dial</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab("notices")}
          style={[styles.tabBtn, activeTab === "notices" && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === "notices" && styles.tabTextActive]}>
            Notices ({notices.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("emergency")}
          style={[styles.tabBtn, activeTab === "emergency" && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === "emergency" && styles.tabTextActive]}>
            🚨 Emergency Contacts
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isError && <QueryErrorView error={error} onRetry={onRefresh} />}

        {activeTab === "notices" ? (
          notices.length > 0 ? (
            notices.map((notice: NoticeItem) => (
              <TouchableOpacity
                key={notice.id}
                onPress={() => setSelectedNotice(notice)}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <Text
                    style={[
                      styles.priorityBadge,
                      notice.priority === "HIGH" ? styles.priorityHigh : styles.priorityNormal,
                    ]}
                  >
                    {notice.priority}
                  </Text>
                  <Text style={styles.dateText}>{notice.published_at}</Text>
                </View>

                <Text style={styles.noticeTitle}>{notice.title}</Text>
                <Text style={styles.noticeBody} numberOfLines={2}>
                  {notice.body}
                </Text>

                <View style={styles.cardFooter}>
                  <Text style={styles.authorText}>Office • {notice.category}</Text>
                  <Text style={styles.readMoreText}>Read Details →</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>📢</Text>
              <Text style={styles.emptyTitle}>No Active Notices</Text>
              <Text style={styles.emptySub}>All management notices and updates will appear here.</Text>
            </View>
          )
        ) : (
          defaultContacts.map((contact) => (
            <View key={contact.id} style={styles.contactCard}>
              <View style={styles.contactIcon}>
                <Text style={{ fontSize: 22 }}>☎️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactDesignation}>{contact.designation || "Emergency Response"}</Text>
                <Text style={styles.contactPhone}>{contact.phone}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleCall(contact.phone)}
                style={styles.callButton}
                activeOpacity={0.8}
              >
                <Text style={styles.callButtonText}>Call</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>


      {/* Notice Detail Reader Modal */}
      <Modal
        visible={!!selectedNotice}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedNotice(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedNotice && (
              <>
                <View style={styles.cardHeader}>
                  <Text
                    style={[
                      styles.priorityBadge,
                      selectedNotice.priority === "HIGH" ? styles.priorityHigh : styles.priorityNormal,
                    ]}
                  >
                    {selectedNotice.priority}
                  </Text>
                  <Text style={styles.dateText}>{selectedNotice.published_at}</Text>
                </View>

                <Text style={styles.modalTitle}>{selectedNotice.title}</Text>
                <Text style={styles.modalAuthor}>Issued by: Estate Management Office ({selectedNotice.category})</Text>

                <ScrollView style={{ maxHeight: 240, marginVertical: 14 }}>
                  <Text style={styles.modalBody}>{selectedNotice.body}</Text>
                </ScrollView>

                <TouchableOpacity
                  onPress={() => setSelectedNotice(null)}
                  style={styles.closeBtn}
                >
                  <Text style={styles.closeBtnText}>Close Notice</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  content: {
    padding: 20,
    gap: 14,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priorityBadge: {
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityHigh: {
    backgroundColor: Colors.dangerLight,
    color: Colors.danger,
  },
  priorityNormal: {
    backgroundColor: Colors.primaryLight,
    color: Colors.primaryDark,
  },
  dateText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  noticeBody: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  authorText: {
    fontSize: 11,
    color: Colors.textLight,
  },
  readMoreText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 8,
  },
  modalAuthor: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  modalBody: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  closeBtn: {
    backgroundColor: Colors.secondary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  closeBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 20,
    gap: 8,
  },
  tabBtn: {
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginRight: 8,
  },
  tabBtnActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  contactName: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },
  contactDesignation: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  contactPhone: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
    marginTop: 2,
  },
  callButton: {
    backgroundColor: "#10b981",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  callButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
  },
});

