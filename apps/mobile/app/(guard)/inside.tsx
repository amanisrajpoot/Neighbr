import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../src/theme/colors";
import { syncEngine } from "../../src/sync/syncEngine";
import { OfflineBanner } from "../../src/components/OfflineBanner";
import { useStaff } from "../../src/hooks/useStaff";

const INITIAL_INSIDE = [
  { id: "ins-1", visitor: "Ananya Roy", type: "Guest", unit: "Villa-42", host: "Siddharth Verma", vehicle: "KA01AB1234", checkIn: "10:14 AM" },
  { id: "ins-2", visitor: "Amazon Delivery Agent", type: "Delivery", unit: "A-302", host: "Vikram Sethi", vehicle: "—", checkIn: "10:30 AM" },
  { id: "ins-3", visitor: "Deepak (AC Technician)", type: "Service", unit: "A-101", host: "Aman Sharma", vehicle: "KA04XY7788", checkIn: "10:45 AM" },
];

const INITIAL_STAFF_INSIDE = [
  { id: "st-1", name: "Laxmi Bai", role: "House Maid & Cook", pass_code: "STF-8821", unit: "Villa-42 & A-102", checkIn: "07:32 AM", phone: "+91 98765 40099" },
  { id: "st-2", name: "Mohan Lal", role: "Car Cleaner", pass_code: "STF-1923", unit: "Tower A & B Basement", checkIn: "06:15 AM", phone: "+91 98765 40077" },
];

export default function GuardInsideScreen() {
  const [activeTab, setActiveTab] = useState<"visitors" | "staff">("visitors");
  const [visitors, setVisitors] = useState(INITIAL_INSIDE);
  const [staffInside, setStaffInside] = useState(INITIAL_STAFF_INSIDE);
  const [search, setSearch] = useState("");
  const { staffCheckOut } = useStaff();

  const filteredVisitors = visitors.filter(
    (v) =>
      v.visitor.toLowerCase().includes(search.toLowerCase()) ||
      v.unit.toLowerCase().includes(search.toLowerCase()) ||
      v.vehicle.toLowerCase().includes(search.toLowerCase())
  );

  const filteredStaff = staffInside.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.role.toLowerCase().includes(search.toLowerCase()) ||
      s.pass_code.toLowerCase().includes(search.toLowerCase())
  );

  const handleCheckOutVisitor = async (id: string, name: string) => {
    Alert.alert("Confirm Egress", `Check out ${name} from society premises?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Check-Out",
        onPress: async () => {
          await syncEngine.logCheckOut(id, "gate-01");
          setVisitors(visitors.filter((v) => v.id !== id));
          Alert.alert("Checked Out", `${name} logged as departed.`);
        },
      },
    ]);
  };

  const handleCheckOutStaff = async (id: string, name: string) => {
    Alert.alert("Staff Departure", `Record exit for ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Exit",
        onPress: async () => {
          try {
            await staffCheckOut({ staffId: id });
          } catch (e) {
            // fallback
          }
          setStaffInside(staffInside.filter((s) => s.id !== id));
          Alert.alert("Staff Exit Logged", `${name} exit recorded at Gate 1.`);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Premises Live Egress Log</Text>
          <Text style={styles.sub}>
            {visitors.length} Guest(s) • {staffInside.length} Staff on Premises
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "visitors" && styles.tabBtnActive]}
          onPress={() => setActiveTab("visitors")}
        >
          <Text style={[styles.tabBtnText, activeTab === "visitors" && styles.tabBtnTextActive]}>
            Guests & Visitors ({visitors.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "staff" && styles.tabBtnActive]}
          onPress={() => setActiveTab("staff")}
        >
          <Text style={[styles.tabBtnText, activeTab === "staff" && styles.tabBtnTextActive]}>
            Daily Help & Staff ({staffInside.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder={activeTab === "visitors" ? "Search visitor name, flat, vehicle..." : "Search staff name, code, service..."}
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          placeholderTextColor="#64748b"
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === "visitors" ? (
          filteredVisitors.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.visitorName}>{item.visitor}</Text>
                  <Text style={styles.unitText}>Destination: {item.unit}</Text>
                  <Text style={styles.metaText}>
                    Host: {item.host} • Entered at {item.checkIn}
                  </Text>
                  {item.vehicle !== "—" && (
                    <Text style={styles.vehicleText}>Vehicle: {item.vehicle}</Text>
                  )}
                </View>

                <TouchableOpacity
                  onPress={() => handleCheckOutVisitor(item.id, item.visitor)}
                  style={styles.checkOutBtn}
                >
                  <Text style={styles.checkOutBtnText}>CHECK-OUT</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          filteredStaff.map((staff) => (
            <View key={staff.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={styles.visitorName}>{staff.name}</Text>
                    <Text style={styles.badgeCode}>{staff.pass_code}</Text>
                  </View>
                  <Text style={styles.unitText}>{staff.role} • {staff.unit}</Text>
                  <Text style={styles.metaText}>Entered Gate 1 at {staff.checkIn}</Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleCheckOutStaff(staff.id, staff.name)}
                  style={[styles.checkOutBtn, styles.staffExitBtn]}
                >
                  <Text style={styles.checkOutBtnText}>LOG EXIT</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {((activeTab === "visitors" && filteredVisitors.length === 0) ||
          (activeTab === "staff" && filteredStaff.length === 0)) && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyText}>No matching entries found on premises.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#1e293b",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },
  sub: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
    fontWeight: "600",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
  },
  tabBtnTextActive: {
    color: "#ffffff",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#1e293b",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  searchInput: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: "#ffffff",
  },
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  visitorName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
  },
  badgeCode: {
    fontFamily: "monospace",
    fontSize: 10,
    color: "#38bdf8",
    backgroundColor: "#0369a120",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: "700",
  },
  unitText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#38bdf8",
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },
  vehicleText: {
    fontSize: 11,
    color: "#e2e8f0",
    fontFamily: "monospace",
    marginTop: 4,
  },
  checkOutBtn: {
    backgroundColor: "#e11d48",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  staffExitBtn: {
    backgroundColor: "#d97706",
  },
  checkOutBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 32,
  },
  emptyText: {
    fontSize: 13,
    color: "#94a3b8",
  },
});
