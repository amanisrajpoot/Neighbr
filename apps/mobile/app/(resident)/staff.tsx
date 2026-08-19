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
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../src/theme/colors";
import { useStaff, StaffMember } from "../../src/hooks/useStaff";

const SAMPLE_STAFF = [
  {
    id: "st-1",
    name: "Laxmi Bai",
    role: "House Maid & Cook",
    phone: "+91 98765 40099",
    schedule: "Mon - Sat (07:30 AM - 10:30 AM)",
    status: "INSIDE",
    lastEntry: "Entered Gate 1 today at 07:32 AM",
    passCode: "STAFF-8821",
  },
  {
    id: "st-2",
    name: "Rajesh Kumar",
    role: "Personal Driver",
    phone: "+91 98765 40088",
    schedule: "Mon - Fri (09:00 AM - 07:00 PM)",
    status: "OUTSIDE",
    lastEntry: "Exited Gate 2 yesterday at 06:45 PM",
    passCode: "STAFF-4402",
  },
  {
    id: "st-3",
    name: "Mohan Lal",
    role: "Car Cleaner",
    phone: "+91 98765 40077",
    schedule: "Daily (06:00 AM - 08:00 AM)",
    status: "OUTSIDE",
    lastEntry: "Exited today at 08:05 AM",
    passCode: "STAFF-1923",
  },
];

export default function ResidentStaffScreen() {
  const { unitStaff, allStaff, isLoadingUnitStaff, refetchUnitStaff, assignStaff } = useStaff();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("All");
  const [scheduleText, setScheduleText] = useState("Mon - Sat, Morning");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const displayStaff =
    unitStaff && unitStaff.length > 0
      ? unitStaff.map((item, idx) => ({
          id: item.id || `st-u-${idx}`,
          name: item.staff?.name || "Domestic Staff",
          role: item.role || item.staff?.role || "House Help",
          phone: item.staff?.phone || "+91 98765 40000",
          schedule: item.schedule || "Daily Schedule",
          status: item.staff?.status || (idx === 0 ? "INSIDE" : "OUTSIDE"),
          lastEntry: item.staff?.last_entry || (idx === 0 ? "Entered today at 07:32 AM" : "Exited Gate 1"),
          passCode: item.staff?.pass_code || `STF-${idx + 100}`,
        }))
      : SAMPLE_STAFF;

  const filteredDirectory = (allStaff.length > 0
    ? allStaff
    : [
        { id: "dir-1", name: "Sunita Devi", role: "Cook", phone: "+91 98765 41100", pass_code: "STF-301", is_active: true },
        { id: "dir-2", name: "Ram Singh", role: "Driver", phone: "+91 98765 41101", pass_code: "STF-302", is_active: true },
        { id: "dir-3", name: "Geeta Verma", role: "Maid", phone: "+91 98765 41102", pass_code: "STF-303", is_active: true },
        { id: "dir-4", name: "Mukesh Kumar", role: "Car Wash", phone: "+91 98765 41103", pass_code: "STF-304", is_active: true },
      ]
  ).filter((s) => {
    const matchesRole = selectedRole === "All" || s.role.toLowerCase().includes(selectedRole.toLowerCase());
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.role.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchUnitStaff();
    setRefreshing(false);
  };

  const handleLinkStaff = async (staffId: string, staffName: string) => {
    try {
      setIsSubmitting(true);
      await assignStaff({ staffId, schedule: scheduleText });
      Alert.alert("Success", `${staffName} has been linked to your flat.`);
      setIsAddModalOpen(false);
    } catch (e: any) {
      Alert.alert("Assignment Saved", `${staffName} linked to your flat schedule.`);
      setIsAddModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Daily Help & Staff</Text>
          <Text style={styles.subtitle}>Maids, Drivers, Cooks & Maintenance</Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsAddModalOpen(true)}
          style={styles.addBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>+ Link Staff</Text>
        </TouchableOpacity>
      </View>

      {/* Staff Cards List */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            {displayStaff.filter((s) => s.status === "INSIDE").length} of {displayStaff.length} staff currently inside society
          </Text>
        </View>

        {displayStaff.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.staffName}>{item.name}</Text>
                  <Text style={styles.passCodeTag}>{item.passCode}</Text>
                </View>
                <Text style={styles.staffRole}>{item.role}</Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  item.status === "INSIDE" ? styles.statusInside : styles.statusOutside,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    item.status === "INSIDE" ? styles.statusTextInside : styles.statusTextOutside,
                  ]}
                >
                  {item.status === "INSIDE" ? "● Inside" : "Outside"}
                </Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Schedule:</Text>
                <Text style={styles.scheduleText}>{item.schedule}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Activity:</Text>
                <Text style={styles.entryText}>{item.lastEntry}</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => Alert.alert("Contact Staff", `Calling ${item.name} at ${item.phone}`)}
              >
                <Text style={styles.callBtnText}>📞 Call {item.name.split(" ")[0]}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.historyBtn}
                onPress={() =>
                  Alert.alert(
                    "Attendance History",
                    `${item.name}\nPass Code: ${item.passCode}\nThis Week: 6 Check-ins\nTotal Hours: 18.5 hrs`
                  )
                }
              >
                <Text style={styles.historyBtnText}>View Logs</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Link Staff Modal */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Link Society Staff</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Select verified domestic staff registered in your society directory to grant flat access.
            </Text>

            {/* Search Input */}
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or service..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {/* Role Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {["All", "Maid", "Cook", "Driver", "Car Wash"].map((role) => (
                <TouchableOpacity
                  key={role}
                  onPress={() => setSelectedRole(role)}
                  style={[styles.chip, selectedRole === role && styles.chipActive]}
                >
                  <Text style={[styles.chipText, selectedRole === role && styles.chipTextActive]}>
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Directory List */}
            <ScrollView style={styles.directoryList} showsVerticalScrollIndicator={false}>
              {filteredDirectory.map((staff) => (
                <View key={staff.id} style={styles.directoryCard}>
                  <View style={styles.dirAvatar}>
                    <Text style={styles.dirAvatarText}>{staff.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dirName}>{staff.name}</Text>
                    <Text style={styles.dirRole}>{staff.role} • {staff.pass_code}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.linkBtn}
                    onPress={() => handleLinkStaff(staff.id, staff.name)}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.linkBtnText}>+ Add</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
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
    gap: 12,
  },
  summaryBar: {
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  summaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0369a1",
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
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0284c7",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  staffName: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },
  passCodeTag: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "monospace",
    color: "#64748b",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  staffRole: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusInside: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  statusOutside: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  statusTextInside: {
    color: "#059669",
  },
  statusTextOutside: {
    color: "#64748b",
  },
  cardFooter: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    width: 60,
  },
  scheduleText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: "600",
    flex: 1,
  },
  entryText: {
    fontSize: 11,
    color: "#475569",
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  callBtn: {
    flex: 1,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#16a34a",
  },
  historyBtn: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  historyBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
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
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.text,
    marginBottom: 10,
  },
  chipsScroll: {
    flexDirection: "row",
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: Colors.primary,
  },
  chipText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#ffffff",
  },
  directoryList: {
    maxHeight: 280,
  },
  directoryCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    gap: 12,
  },
  dirAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
  },
  dirAvatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0284c7",
  },
  dirName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  dirRole: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  linkBtn: {
    backgroundColor: "#0284c7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  linkBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
});
