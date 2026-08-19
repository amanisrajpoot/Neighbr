import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "../../src/theme/colors";
import { useAuthStore } from "../../src/store/authStore";
import { localDb } from "../../src/database/sqlite";

const PASS_TYPES = [
  { id: "guest", label: "Guest", emoji: "🎟️" },
  { id: "delivery", label: "Delivery", emoji: "📦" },
  { id: "cab", label: "Cab / Taxi", emoji: "🚖" },
  { id: "service", label: "Service", emoji: "🛠️" },
];

export default function CreatePassScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [selectedType, setSelectedType] = useState("guest");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [purpose, setPurpose] = useState("");

  // Generated pass state
  const [generatedPass, setGeneratedPass] = useState<{
    id: string;
    qrToken: string;
    name: string;
    validUntil: string;
    type?: string;
  } | null>(null);

  const handleGeneratePass = async () => {
    if (!name) {
      Alert.alert("Required", "Please enter the visitor's name.");
      return;
    }

    const token = `NBR-${selectedType.toUpperCase().substring(0, 3)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newPass = {
      id: `pass-${Date.now()}`,
      qrToken: token,
      name,
      validUntil: "Today, 11:59 PM",
      type: selectedType,
    };

    try {
      await localDb.cachePasses([
        {
          id: newPass.id,
          qr_token: newPass.qrToken,
          visitor_name: name,
          visitor_phone: phone,
          unit_id: user?.unitNumber || "Villa-42",
          valid_from: new Date().toISOString(),
          valid_until: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          status: "APPROVED",
          synced_at: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      console.warn("Could not cache pass to SQLite:", e);
    }

    setGeneratedPass(newPass);
  };

  const handleSharePass = async () => {
    if (!generatedPass) return;
    const message = `🎟️ *Neighbr Gate Pass*\n\nHello ${generatedPass.name},\nYour entry gate pass for *${user?.societyName || "Greenwood Palms"} (Flat ${user?.unitNumber || "Villa-42"})* has been approved.\n\n🔑 *Pass Code / Token:* ${generatedPass.qrToken}\n⏰ *Valid Until:* ${generatedPass.validUntil}\n\nShow this code or scan at the security gate for seamless entry.`;

    try {
      await Share.share({
        message,
        title: "Neighbr Gate Pass",
      });
    } catch (e) {
      Alert.alert("Pass Code", `Pass token: ${generatedPass.qrToken}`);
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
            <Text style={styles.label}>Visitor Type</Text>
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

              <TouchableOpacity onPress={handleGeneratePass} style={styles.generateButton}>
                <Text style={styles.generateButtonText}>Generate Signed QR Pass</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* Generated QR Pass Preview */
          <View style={styles.qrPassContainer}>
            <View style={styles.qrCard}>
              <View style={styles.passHeader}>
                <Text style={styles.societyBadge}>Greenwood Palms Heights</Text>
                <Text style={styles.passTypeBadge}>{selectedType.toUpperCase()}</Text>
              </View>

              <View style={styles.qrPlaceholder}>
                <Text style={styles.qrEmoji}>📱</Text>
                <Text style={styles.qrCodeText}>{generatedPass.qrToken}</Text>
                <Text style={styles.qrSub}>Scan at Gate Security Terminal</Text>
              </View>

              <View style={styles.passDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Visitor:</Text>
                  <Text style={styles.detailValue}>{generatedPass.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Destination:</Text>
                  <Text style={styles.detailValue}>Villa-42</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Valid Until:</Text>
                  <Text style={styles.detailValue}>{generatedPass.validUntil}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSharePass}
              style={styles.shareButton}
            >
              <Text style={styles.shareButtonText}>📤 Share Pass on WhatsApp / SMS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setGeneratedPass(null);
                setName("");
              }}
              style={styles.newPassButton}
            >
              <Text style={styles.newPassButtonText}>Create Another Pass</Text>
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
    paddingVertical: 12,
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
    fontWeight: "700",
    color: Colors.text,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 6,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  typeTile: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  typeTileActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  typeEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  typeLabelActive: {
    color: Colors.primaryDark,
    fontWeight: "700",
  },
  form: {
    gap: 14,
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.text,
  },
  generateButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  generateButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  qrPassContainer: {
    gap: 16,
    alignItems: "center",
  },
  qrCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  passHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  societyBadge: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  passTypeBadge: {
    fontSize: 10,
    fontWeight: "800",
    backgroundColor: Colors.primaryLight,
    color: Colors.primaryDark,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  qrPlaceholder: {
    backgroundColor: "#f1f5f9",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginVertical: 10,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: Colors.border,
  },
  qrEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  qrCodeText: {
    fontFamily: "monospace",
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: 1,
  },
  qrSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  passDetails: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text,
  },
  shareButton: {
    width: "100%",
    backgroundColor: "#25D366", // WhatsApp green
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  shareButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  newPassButton: {
    paddingVertical: 10,
  },
  newPassButtonText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
});
