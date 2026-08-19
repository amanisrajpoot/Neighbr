import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../src/theme/colors";

const SAMPLE_NOTICES = [
  {
    id: "n-1",
    title: "Quarterly Water Tank Cleaning & Supply Interruption",
    body: "Water supply across all towers (A, B, and Villas) will be briefly paused between 2:00 PM and 5:00 PM this coming Sunday for scheduled pressure cleaning of overhead reservoirs. Residents are advised to store adequate water.",
    category: "Maintenance",
    priority: "HIGH",
    published_at: "Today, 08:30 AM",
    author: "Estate Management",
  },
  {
    id: "n-2",
    title: "Clubhouse Gymnasium Equipment Upgrades Completed",
    body: "New treadmills and strength conditioning racks are now operational in the primary clubhouse gym. Residents are requested to carry their digital pass for biometric access.",
    category: "General",
    priority: "NORMAL",
    published_at: "Yesterday",
    author: "RWA Secretary",
  },
  {
    id: "n-3",
    title: "Visitor Gate Pass Verification Protocol Reminder",
    body: "All domestic delivery partners and cabs must present their digital QR pass at Main North Gate. Pre-approve your visitors via the Neighbr app for rapid gate check-in.",
    category: "Security",
    priority: "NORMAL",
    published_at: "3 days ago",
    author: "Head of Security",
  },
];

export default function ResidentNoticesScreen() {
  const [selectedNotice, setSelectedNotice] = useState<typeof SAMPLE_NOTICES[0] | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Society Notice Board</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {SAMPLE_NOTICES.map((notice) => (
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
              <Text style={styles.authorText}>By {notice.author}</Text>
              <Text style={styles.readMoreText}>Read Details →</Text>
            </View>
          </TouchableOpacity>
        ))}
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
                <Text style={styles.modalAuthor}>Issued by: {selectedNotice.author}</Text>

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
});
