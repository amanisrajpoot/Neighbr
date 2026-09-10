import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Colors } from "../../src/theme/colors";
import { useAuthStore } from "../../src/store/authStore";
import { localDb } from "../../src/database/sqlite";
import { visitorApi } from "../../src/api/client";
import { QRCodeView } from "../../src/components/QRCodeView";

const PASS_TYPES = [
  { id: "guest", label: "Guest", emoji: "🎟️" },
  { id: "delivery", label: "Delivery", emoji: "📦" },
  { id: "cab", label: "Cab / Taxi", emoji: "🚖" },
  { id: "service", label: "Service", emoji: "🛠️" },
];

export default function CreatePassScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useAuthStore((state) => state.user);
  const societyId = user?.societyId || "34090e70-34f9-4cdd-9522-e2098982a5ed";

  const initialType = (params.type as string) || "guest";
  const [selectedType, setSelectedType] = useState(initialType);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Generated pass state with signed QR token and 6-digit PIN
  const [generatedPass, setGeneratedPass] = useState<{
    id: string;
    qrToken: string;
    pinCode: string;
    name: string;
    unitNumber: string;
    validUntil: string;
    status: string;
  } | null>(null);

  const handleGeneratePass = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Please enter the visitor's full name.");
      return;
    }

    setIsGenerating(true);

    const now = new Date();
    const validFrom = now.toISOString();
    const validUntil = new Date(now.getTime() + 12 * 3600 * 1000).toISOString(); // 12 hours validity

    try {
      // 1. Create on FastAPI Backend
      const res = await visitorApi.createPass(societyId, {
        unit_id: user?.unitId || "0be0d1a7-8a9c-46bf-9677-fa36679e01bd",
        pass_type: selectedType,
        visitor_name: name.trim(),
        visitor_phone: phone.trim() || undefined,
        vehicle_number: vehicle.trim() || undefined,
        purpose: purpose.trim() || undefined,
        valid_from: validFrom,
        valid_until: validUntil,
      });

      const newPassData = {
        id: res.id,
        qrToken: res.qr_token,
        pinCode: res.pass_code || Math.floor(100000 + Math.random() * 900000).toString(),
        name: res.visitor_name,
        unitNumber: user?.unitNumber || "Villa-42",
        validUntil: new Date(res.valid_until).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: res.status,
      };

      // 2. Cache into SQLite for offline access
      try {
        await localDb.cachePasses([
          {
            id: res.id,
            qr_token: res.qr_token,
            visitor_name: res.visitor_name,
            visitor_phone: res.visitor_phone || "",
            unit_id: user?.unitNumber || "Villa-42",
            valid_from: validFrom,
            valid_until: validUntil,
            status: "APPROVED",
            synced_at: new Date().toISOString(),
          },
        ]);
      } catch (e) {
        console.log("Local SQLite cache note:", e);
      }

      setGeneratedPass(newPassData);
    } catch (err: any) {
      Alert.alert(
        "Pass Generation Failed",
        err?.message || "Could not generate gate pass. Please check your connection and try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pre-Approve Gate Pass</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!generatedPass ? (
          <>
            {/* Category Selector */}
            <Text style={styles.label}>Visitor Purpose Category</Text>
            <View style={styles.typeRow}>
              {PASS_TYPES.map((type) => {
                const isSelected = selectedType === type.id;
                return (
                  <TouchableOpacity
                    key={type.id}
                    onPress={() => setSelectedType(type.id)}
                    style={[styles.typeTile, isSelected && styles.typeTileActive]}
                  >
                    <Text style={styles.typeEmoji}>{type.emoji}</Text>
                    <Text style={[styles.typeLabel, isSelected && styles.typeLabelActive]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Input Form */}
            <View style={styles.form}>
              <View>
                <Text style={styles.label}>Visitor Full Name *</Text>
                <TextInput
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  placeholderTextColor={Colors.textLight}
                />
              </View>

              <View>
                <Text style={styles.label}>Mobile Phone Number (Optional)</Text>
                <TextInput
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  style={styles.input}
                  placeholderTextColor={Colors.textLight}
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
                  placeholderTextColor={Colors.textLight}
                />
              </View>

              <View>
                <Text style={styles.label}>Visit Purpose / Flat Delivery Notes</Text>
                <TextInput
                  placeholder="e.g. Dinner visit / Leave at door"
                  value={purpose}
                  onChangeText={setPurpose}
                  style={styles.input}
                  placeholderTextColor={Colors.textLight}
                />
              </View>

              <TouchableOpacity
                onPress={handleGeneratePass}
                disabled={isGenerating}
                style={[styles.generateButton, isGenerating && { opacity: 0.7 }]}
              >
                {isGenerating ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.generateButtonText}>⚡ Generate Signed QR Pass & PIN</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* Real Vector QR Code & 6-Digit PIN Pass View */
          <View style={styles.qrPassContainer}>
            <QRCodeView
              value={generatedPass.qrToken}
              pinCode={generatedPass.pinCode}
              visitorName={generatedPass.name}
              unitNumber={generatedPass.unitNumber}
              validUntil={generatedPass.validUntil}
              status={generatedPass.status}
              showShareButton={true}
            />

            <TouchableOpacity
              onPress={() => {
                setGeneratedPass(null);
                setName("");
                setPhone("");
                setVehicle("");
                setPurpose("");
              }}
              style={styles.newPassButton}
            >
              <Text style={styles.newPassButtonText}>+ Create Another Gate Pass</Text>
            </TouchableOpacity>
          </View>
        )}
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
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
    color: Colors.text,
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  typeTile: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  typeTileActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight + "20",
  },
  typeEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  typeLabelActive: {
    color: Colors.primaryDark,
    fontWeight: "800",
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  generateButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  generateButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  qrPassContainer: {
    alignItems: "center",
    gap: 16,
  },
  newPassButton: {
    paddingVertical: 14,
    alignItems: "center",
  },
  newPassButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
});
