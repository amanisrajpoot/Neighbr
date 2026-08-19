import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "../../src/theme/colors";
import { syncEngine } from "../../src/sync/syncEngine";
import { OfflineBanner } from "../../src/components/OfflineBanner";
import { SearchablePicker } from "../../src/components/SearchablePicker";

const CATEGORIES = ["Delivery", "Guest", "Cab", "Service / Repair", "Other"];

export default function GuardWalkInScreen() {
  const router = useRouter();
  const [visitorName, setVisitorName] = useState("");
  const [phone, setPhone] = useState("");
  const [destinationUnit, setDestinationUnit] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [category, setCategory] = useState("Delivery");

  const handleSubmitWalkIn = async () => {
    if (!visitorName || !destinationUnit) {
      Alert.alert("Required Fields", "Please enter visitor name and destination flat number.");
      return;
    }

    await syncEngine.logWalkIn({
      visitor_name: visitorName,
      visitor_phone: phone,
      unit_id: destinationUnit,
      visitor_type: category,
      vehicle_number: vehicle,
      gate_id: "gate-01",
    });

    Alert.alert(
      "Walk-in Request Logged",
      `Resident of ${destinationUnit} has been notified and entry is logged in local sync queue.`,
      [
        {
          text: "OK",
          onPress: () => {
            setVisitorName("");
            setPhone("");
            setDestinationUnit("");
            setVehicle("");
            router.push("/(guard)/inside");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Unscheduled Walk-in Entry</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Category Pills */}
        <Text style={styles.label}>Visitor Purpose Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                style={[styles.catPill, isSelected && styles.catPillActive]}
              >
                <Text style={[styles.catText, isSelected && styles.catTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.form}>
          <View>
            <Text style={styles.label}>Visitor Full Name *</Text>
            <TextInput
              placeholder="e.g. Swiggy Delivery Agent"
              value={visitorName}
              onChangeText={setVisitorName}
              style={styles.input}
              placeholderTextColor="#64748b"
            />
          </View>

          <View>
            <Text style={styles.label}>Destination Unit / Flat *</Text>
            <SearchablePicker
              title="Select Destination Unit"
              placeholder="Search by Flat Number or Resident Name..."
              searchPlaceholder="Type flat number (e.g. 42) or name..."
              selectedId={destinationUnit}
              onSelect={(item) => setDestinationUnit(item.id)}
              items={[
                { id: "Villa-42", label: "Villa-42 (Tower A)", subLabel: "Siddharth Verma • Owner", badge: "Villa", icon: "🏡" },
                { id: "A-101", label: "Flat A-101 (Tower A, 1st Floor)", subLabel: "Aman Sharma • Resident", badge: "Apartment", icon: "🏢" },
                { id: "A-102", label: "Flat A-102 (Tower A, 1st Floor)", subLabel: "Pooja Reddy • Resident", badge: "Apartment", icon: "🏢" },
                { id: "A-302", label: "Flat A-302 (Tower A, 3rd Floor)", subLabel: "Vikram Sethi • Resident", badge: "Apartment", icon: "🏢" },
                { id: "B-204", label: "Flat B-204 (Tower B, 2nd Floor)", subLabel: "Rahul Dravid • Resident", badge: "Apartment", icon: "🏢" },
                { id: "Clubhouse", label: "Clubhouse Administration Office", subLabel: "Estate Facility Manager", badge: "Common", icon: "🏊" },
              ]}
            />
          </View>

          <View>
            <Text style={styles.label}>Phone Number (Optional)</Text>
            <TextInput
              placeholder="+91 98765 00000"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={styles.input}
              placeholderTextColor="#64748b"
            />
          </View>

          <View>
            <Text style={styles.label}>Vehicle License Plate (Optional)</Text>
            <TextInput
              placeholder="e.g. KA01AB1234"
              value={vehicle}
              onChangeText={setVehicle}
              autoCapitalize="characters"
              style={styles.input}
              placeholderTextColor="#64748b"
            />
          </View>

          <TouchableOpacity onPress={handleSubmitWalkIn} style={styles.submitBtn}>
            <Text style={styles.submitBtnText}>NOTIFY RESIDENT & LOG ENTRY</Text>
          </TouchableOpacity>
        </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#1e293b",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  backBtn: {
    padding: 6,
  },
  backText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  content: {
    padding: 20,
    gap: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  catRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 4,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  catPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
  },
  catTextActive: {
    color: "#ffffff",
  },
  form: {
    gap: 14,
  },
  input: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#ffffff",
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
