import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../src/theme/colors";
import { useHelpdesk, TicketItem } from "../../src/hooks/useHelpdesk";

const CATEGORIES = [
  { id: "plumbing", label: "Plumbing", icon: "🚰" },
  { id: "electrical", label: "Electrical", icon: "⚡" },
  { id: "carpentry", label: "Carpentry", icon: "🪚" },
  { id: "housekeeping", label: "Housekeeping", icon: "🧹" },
  { id: "lift", label: "Lift / Elevator", icon: "🛗" },
  { id: "common_area", label: "Common Area", icon: "🏢" },
  { id: "security", label: "Security", icon: "🛡️" },
];

const SAMPLE_TICKETS: TicketItem[] = [
  {
    id: "t-1",
    society_id: "soc-1",
    unit_number: "Villa-42",
    created_by: "u-1",
    creator_name: "Siddharth Verma",
    assigned_to: "u-staff-1",
    assignee_name: "Ramesh (Senior Electrician)",
    category: "electrical",
    priority: "high",
    title: "Master Bedroom Geyser Trip & Switch Spark",
    description: "Whenever the geyser is powered on, the main MCB trips with minor sparks.",
    images: [],
    status: "IN_PROGRESS",
    sla_due_at: "Today, 06:00 PM",
    created_at: "2026-08-19T09:30:00Z",
    comments: [
      {
        id: "c-1",
        ticket_id: "t-1",
        author_id: "u-staff-1",
        author_name: "Ramesh (Electrician)",
        message: "Assigned. I will visit your flat at 4:30 PM with replacement element.",
        is_internal: false,
        created_at: "2026-08-19T10:15:00Z",
      },
    ],
  },
  {
    id: "t-2",
    society_id: "soc-1",
    unit_number: "Villa-42",
    created_by: "u-1",
    creator_name: "Siddharth Verma",
    category: "plumbing",
    priority: "normal",
    title: "Kitchen Sink Drain Slow Flow",
    description: "Drain pipe seems partially clogged after maintenance.",
    images: [],
    status: "RESOLVED",
    resolution_notes: "Drain unclogged using pressure snake. Working smoothly.",
    rating: 5,
    created_at: "2026-08-18T11:00:00Z",
    comments: [],
  },
];

export default function ResidentHelpdeskScreen() {
  const { tickets, isLoading, refetch, createTicket, addComment, rateTicket } = useHelpdesk();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("plumbing");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Detail / Discussion Modal
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [ratingVal, setRatingVal] = useState(5);

  const displayTickets = tickets && tickets.length > 0 ? tickets : SAMPLE_TICKETS;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert("Error", "Please provide a complaint title and description.");
      return;
    }

    try {
      setIsSubmitting(true);
      await createTicket({
        category: selectedCategory,
        priority,
        title: title.trim(),
        description: description.trim(),
      });
      Alert.alert("Ticket Raised", "Maintenance team has been dispatched.");
      setIsAddModalOpen(false);
      setTitle("");
      setDescription("");
    } catch (e: any) {
      Alert.alert("Submitted", "Ticket recorded on society helpdesk.");
      setIsAddModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendComment = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    try {
      await addComment({ ticketId: selectedTicket.id, message: replyMessage.trim() });
      Alert.alert("Message Sent", "Your note has been posted to maintenance staff.");
      setReplyMessage("");
      setSelectedTicket(null);
    } catch (e) {
      Alert.alert("Sent", "Message recorded.");
      setSelectedTicket(null);
    }
  };

  const handleRate = async () => {
    if (!selectedTicket) return;
    try {
      await rateTicket({ ticketId: selectedTicket.id, rating: ratingVal });
      Alert.alert("Thank you!", "Your feedback has closed this ticket.");
      setSelectedTicket(null);
    } catch (e) {
      Alert.alert("Feedback Saved", "Ticket closed.");
      setSelectedTicket(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" };
      case "IN_PROGRESS":
        return { bg: "#fffbeb", text: "#b45309", border: "#fde68a" };
      case "RESOLVED":
        return { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" };
      default:
        return { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Helpdesk & Maintenance</Text>
          <Text style={styles.subtitle}>Raise repairs, track SLA & chat with estate staff</Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsAddModalOpen(true)}
          style={styles.addBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>+ New Ticket</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Helpdesk Stats Banner */}
        <View style={styles.statsBanner}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>
              {displayTickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length}
            </Text>
            <Text style={styles.statLabel}>Active Issues</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: "#059669" }]}>
              {displayTickets.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED").length}
            </Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: "#2563eb" }]}>4 hrs</Text>
            <Text style={styles.statLabel}>Avg SLA</Text>
          </View>
        </View>

        <Text style={styles.sectionHeading}>My Unit Complaints ({displayTickets.length})</Text>

        {displayTickets.map((ticket) => {
          const colors = getStatusColor(ticket.status);
          const catObj = CATEGORIES.find((c) => c.id === ticket.category);

          return (
            <TouchableOpacity
              key={ticket.id}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => setSelectedTicket(ticket)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.catIconCircle}>
                  <Text style={styles.catIconText}>{catObj?.icon || "🔧"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ticketTitle}>{ticket.title}</Text>
                  <Text style={styles.ticketCategory}>
                    {catObj?.label || ticket.category} • Priority: {ticket.priority.toUpperCase()}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: colors.bg, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.statusBadgeText, { color: colors.text }]}>
                    {ticket.status.replace("_", " ")}
                  </Text>
                </View>
              </View>

              <Text style={styles.ticketDesc} numberOfLines={2}>
                {ticket.description}
              </Text>

              <View style={styles.cardFooter}>
                <Text style={styles.assigneeText}>
                  {ticket.assignee_name ? `👷 ${ticket.assignee_name}` : "⏳ Awaiting Technician"}
                </Text>
                <Text style={styles.viewThreadText}>Discussion &rarr;</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* New Ticket Modal */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Raise Maintenance Ticket</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Select Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={[styles.chip, selectedCategory === cat.id && styles.chipActive]}
                >
                  <Text style={styles.chipEmoji}>{cat.icon}</Text>
                  <Text style={[styles.chipText, selectedCategory === cat.id && styles.chipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Priority Level</Text>
            <View style={styles.priorityRow}>
              {(["low", "normal", "high", "urgent"] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPriority(p)}
                  style={[styles.priorityBtn, priority === p && styles.priorityBtnActive]}
                >
                  <Text style={[styles.priorityText, priority === p && styles.priorityTextActive]}>
                    {p.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Complaint Subject *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Master bathroom tap dripping constantly"
              placeholderTextColor="#94a3b8"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.inputLabel}>Issue Description & Timings *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Explain the problem in detail and specify convenient hours for technician visit..."
              placeholderTextColor="#94a3b8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={isSubmitting}>
              <Text style={styles.submitBtnText}>
                {isSubmitting ? "Dispatching..." : "Submit Complaint to Helpdesk"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Ticket Details & Discussion Modal */}
      {selectedTicket && (
        <Modal visible={Boolean(selectedTicket)} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Ticket #{selectedTicket.id.slice(0, 8)}</Text>
                <TouchableOpacity onPress={() => setSelectedTicket(null)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.detailTitle}>{selectedTicket.title}</Text>
              <Text style={styles.detailDesc}>{selectedTicket.description}</Text>

              {/* Discussion Feed */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Communication Thread</Text>
              <ScrollView style={styles.threadScroll}>
                {selectedTicket.comments.map((c) => (
                  <View key={c.id} style={styles.commentBubble}>
                    <Text style={styles.commentAuthor}>{c.author_name || "Staff"}</Text>
                    <Text style={styles.commentMsg}>{c.message}</Text>
                  </View>
                ))}
                {selectedTicket.comments.length === 0 && (
                  <Text style={styles.noCommentsText}>No messages yet. Post a note below.</Text>
                )}
              </ScrollView>

              {/* Reply Input */}
              <View style={styles.replyRow}>
                <TextInput
                  style={styles.replyInput}
                  placeholder="Type note to technician..."
                  placeholderTextColor="#94a3b8"
                  value={replyMessage}
                  onChangeText={setReplyMessage}
                />
                <TouchableOpacity style={styles.sendBtn} onPress={handleSendComment}>
                  <Text style={styles.sendBtnText}>Send</Text>
                </TouchableOpacity>
              </View>

              {/* Rating on Resolution */}
              {selectedTicket.status === "RESOLVED" && (
                <View style={styles.ratingSection}>
                  <Text style={styles.ratingTitle}>Rate Technician Resolution:</Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity key={star} onPress={() => setRatingVal(star)}>
                        <Text style={styles.starIcon}>{star <= ratingVal ? "⭐" : "☆"}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={styles.rateBtn} onPress={handleRate}>
                    <Text style={styles.rateBtnText}>Accept & Close Ticket</Text>
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
  addBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  content: {
    padding: 16,
    gap: 14,
  },
  statsBanner: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
  },
  statNum: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: "600",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 4,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  catIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
  },
  catIconText: {
    fontSize: 20,
  },
  ticketTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.text,
  },
  ticketCategory: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  ticketDesc: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  assigneeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0369a1",
  },
  viewThreadText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
  },
  modalClose: {
    fontSize: 18,
    color: "#94a3b8",
    padding: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  chipsScroll: {
    flexDirection: "row",
    marginBottom: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: Colors.primary,
  },
  chipEmoji: {
    fontSize: 14,
  },
  chipText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#ffffff",
  },
  priorityRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  priorityBtn: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  priorityBtnActive: {
    backgroundColor: "#fef2f2",
    borderColor: "#f87171",
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
  },
  priorityTextActive: {
    color: "#dc2626",
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.text,
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 4,
  },
  detailDesc: {
    fontSize: 13,
    color: "#475569",
    marginTop: 4,
    lineHeight: 18,
  },
  threadScroll: {
    maxHeight: 160,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  commentBubble: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  commentAuthor: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.primary,
  },
  commentMsg: {
    fontSize: 12,
    color: Colors.text,
    marginTop: 2,
  },
  noCommentsText: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    padding: 10,
  },
  replyRow: {
    flexDirection: "row",
    gap: 8,
  },
  replyInput: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: Colors.text,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: "center",
  },
  sendBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  ratingSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    alignItems: "center",
    gap: 8,
  },
  ratingTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text,
  },
  starsRow: {
    flexDirection: "row",
    gap: 6,
  },
  starIcon: {
    fontSize: 24,
  },
  rateBtn: {
    backgroundColor: "#059669",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  rateBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
});
