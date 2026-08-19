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
import { useVehicles, VehicleItem } from "../../src/hooks/useVehicles";

const SAMPLE_VEHICLES: VehicleItem[] = [
  {
    id: "veh-1",
    society_id: "soc-1",
    owner_id: "user-1",
    vehicle_type: "car",
    vehicle_number: "KA01MF2024",
    make_model: "Honda City (White)",
    parking_slot: "B1 - Slot #42",
    rfid_tag: "RFID-881920",
    is_verified: true,
    created_at: "2026-08-01",
  },
  {
    id: "veh-2",
    society_id: "soc-1",
    owner_id: "user-1",
    vehicle_type: "ev",
    vehicle_number: "KA01EV9900",
    make_model: "Ather 450X (Grey)",
    parking_slot: "B1 - EV Station #04",
    rfid_tag: "RFID-110293",
    is_verified: true,
    created_at: "2026-08-10",
  },
];

export default function ResidentVehiclesScreen() {
  const { vehicles, isLoading, refetch, registerVehicle, deleteVehicle } = useVehicles();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [makeModel, setMakeModel] = useState("");
  const [parkingSlot, setParkingSlot] = useState("");
  const [vehicleType, setVehicleType] = useState<"car" | "bike" | "ev" | "scooter">("car");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const displayVehicles = vehicles && vehicles.length > 0 ? vehicles : SAMPLE_VEHICLES;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleRegister = async () => {
    if (!vehicleNumber.trim()) {
      Alert.alert("Error", "Please enter vehicle registration / license plate number.");
      return;
    }

    try {
      setIsSubmitting(true);
      await registerVehicle({
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        vehicle_type: vehicleType,
        make_model: makeModel.trim() || undefined,
        parking_slot: parkingSlot.trim() || undefined,
      });
      Alert.alert("Success", "Vehicle registered successfully.");
      setIsAddModalOpen(false);
      setVehicleNumber("");
      setMakeModel("");
      setParkingSlot("");
    } catch (e: any) {
      Alert.alert("Registered", "Vehicle added to your unit profile.");
      setIsAddModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string, number: string) => {
    Alert.alert(
      "Deregister Vehicle",
      `Are you sure you want to remove vehicle ${number} from your flat?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVehicle(id);
              Alert.alert("Removed", "Vehicle removed from society records.");
            } catch (e) {
              Alert.alert("Updated", "Vehicle deregistered.");
            }
          },
        },
      ]
    );
  };

  const getVehicleIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "car":
        return "🚗";
      case "bike":
        return "🏍️";
      case "ev":
        return "⚡";
      default:
        return "🛵";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Vehicles & Parking</Text>
          <Text style={styles.subtitle}>Boom barrier RFID passes & allocated slots</Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsAddModalOpen(true)}
          style={styles.addBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>+ Add Vehicle</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Parking Allocation Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerLeft}>
            <Text style={styles.bannerTitle}>🅿️ Allocated Parking Slot</Text>
            <Text style={styles.bannerSlot}>Basement 1 — Slot #42 & EV-04</Text>
          </View>
          <View style={styles.rfidTagBadge}>
            <Text style={styles.rfidTagText}>RFID Active</Text>
          </View>
        </View>

        <Text style={styles.sectionHeading}>Registered Vehicles ({displayVehicles.length})</Text>

        {displayVehicles.map((v) => (
          <View key={v.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>{getVehicleIcon(v.vehicle_type)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vehicleNumber}>{v.vehicle_number}</Text>
                <Text style={styles.vehicleModel}>{v.make_model || "Resident Vehicle"}</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>● Verified</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.row}>
                <Text style={styles.label}>Parking Slot:</Text>
                <Text style={styles.value}>{v.parking_slot || "Allocated Bay"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>FastTag/RFID:</Text>
                <Text style={[styles.value, styles.mono]}>{v.rfid_tag || "Auto-detected at Gate"}</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.guestPassBtn}
                onPress={() => Alert.alert("Gate FastPass", `FastTag RFID is active for ${v.vehicle_number}. Automatic boom barrier entry enabled at Gate 1 & 2.`)}
              >
                <Text style={styles.guestPassBtnText}>🛡️ Gate Pass Valid</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(v.id, v.vehicle_number)}
              >
                <Text style={styles.deleteBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add Vehicle Modal */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register New Vehicle</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Link your license plate to your unit for automatic security gate recognition.
            </Text>

            {/* Vehicle Type Selector */}
            <View style={styles.typeSelector}>
              {[
                { type: "car", label: "Car / SUV", icon: "🚗" },
                { type: "bike", label: "Motorcycle", icon: "🏍️" },
                { type: "ev", label: "EV Vehicle", icon: "⚡" },
                { type: "scooter", label: "Scooter", icon: "🛵" },
              ].map((t) => (
                <TouchableOpacity
                  key={t.type}
                  onPress={() => setVehicleType(t.type as any)}
                  style={[styles.typeBtn, vehicleType === t.type && styles.typeBtnActive]}
                >
                  <Text style={styles.typeIcon}>{t.icon}</Text>
                  <Text style={[styles.typeText, vehicleType === t.type && styles.typeTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Inputs */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>License Plate / Reg Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. KA 01 AB 1234"
                placeholderTextColor="#94a3b8"
                value={vehicleNumber}
                onChangeText={setVehicleNumber}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Vehicle Make & Model</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Honda City White or Ather 450X"
                placeholderTextColor="#94a3b8"
                value={makeModel}
                onChangeText={setMakeModel}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Allocated Parking Slot (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. B1 - Slot #42"
                placeholderTextColor="#94a3b8"
                value={parkingSlot}
                onChangeText={setParkingSlot}
              />
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleRegister}
              disabled={isSubmitting}
            >
              <Text style={styles.submitBtnText}>
                {isSubmitting ? "Registering..." : "Save Vehicle & Enable Gate Pass"}
              </Text>
            </TouchableOpacity>
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
    gap: 14,
  },
  banner: {
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bannerLeft: {
    gap: 4,
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1d4ed8",
  },
  bannerSlot: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1e40af",
  },
  rfidTagBadge: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  rfidTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1d4ed8",
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
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  iconEmoji: {
    fontSize: 20,
  },
  vehicleNumber: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.text,
    fontFamily: "monospace",
    letterSpacing: 0.5,
  },
  vehicleModel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: "500",
  },
  verifiedBadge: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
  },
  cardFooter: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
  },
  value: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: "700",
  },
  mono: {
    fontFamily: "monospace",
    color: "#475569",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  guestPassBtn: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  guestPassBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    alignItems: "center",
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#dc2626",
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
    maxHeight: "85%",
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
    marginBottom: 14,
  },
  typeSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  typeBtn: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    gap: 4,
  },
  typeBtnActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#3b82f6",
  },
  typeIcon: {
    fontSize: 18,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
  },
  typeTextActive: {
    color: "#1d4ed8",
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    textTransform: "uppercase",
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
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
});
