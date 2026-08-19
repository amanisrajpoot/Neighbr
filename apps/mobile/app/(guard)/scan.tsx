import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "../../src/theme/colors";
import { syncEngine } from "../../src/sync/syncEngine";
import { OfflineBanner } from "../../src/components/OfflineBanner";

export default function GuardScanScreen() {
  const router = useRouter();
  const [manualCode, setManualCode] = useState("");
  const [scannedResult, setScannedResult] = useState<{
    visitor: string;
    phone: string;
    unit: string;
    type: string;
    vehicle: string;
    status: "VALID" | "EXPIRED" | "BLACKLISTED";
  } | null>(null);

  const handleSimulateScan = (codeToScan?: string) => {
    const code = codeToScan || manualCode || "NBR-TOKEN-ANANYA";
    
    if (code.includes("BLACKLIST")) {
      setScannedResult({
        visitor: "Unauthorized Person",
        phone: "+91 99999 88888",
        unit: "A-101",
        type: "Unknown",
        vehicle: "KA01ZZ9999",
        status: "BLACKLISTED",
      });
      return;
    }

    setScannedResult({
      visitor: "Ananya Roy",
      phone: "+91 98765 30099",
      unit: "Villa-42 (Siddharth Verma)",
      type: "Guest",
      vehicle: "KA01AB1234",
      status: "VALID",
    });
  };

  const handleConfirmCheckIn = async () => {
    if (scannedResult) {
      await syncEngine.logCheckIn(scannedResult.visitor, "gate-01", {
        visitor_name: scannedResult.visitor,
        visitor_phone: scannedResult.phone,
        unit: scannedResult.unit,
        type: scannedResult.type,
        vehicle: scannedResult.vehicle,
      });
    }

    Alert.alert("✅ Verified & Checked In", "Gate opened. Visitor logged into society directory & sync queue.", [
      {
        text: "Done",
        onPress: () => {
          setScannedResult(null);
          setManualCode("");
          router.push("/(guard)/inside");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Visitor QR Pass</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {!scannedResult ? (
          <>
            {/* Scanner Frame */}
            <View style={styles.scannerFrame}>
              <View style={styles.reticleCornerTL} />
              <View style={styles.reticleCornerTR} />
              <View style={styles.reticleCornerBL} />
              <View style={styles.reticleCornerBR} />

              <Text style={styles.scanPromptText}>Point Camera at Visitor Pass QR</Text>

              {/* Instant Test Scan Button */}
              <TouchableOpacity
                onPress={() => handleSimulateScan()}
                style={styles.testScanBtn}
              >
                <Text style={styles.testScanText}>⚡ Simulate Camera Scan</Text>
              </TouchableOpacity>
            </View>

            {/* Manual Code Input Fallback */}
            <View style={styles.manualCard}>
              <Text style={styles.manualTitle}>Manual Code Entry Fallback</Text>
              <View style={styles.inputRow}>
                <TextInput
                  placeholder="Enter NBR-TOKEN-XXXX"
                  value={manualCode}
                  onChangeText={setManualCode}
                  style={styles.manualInput}
                  placeholderTextColor="#64748b"
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  onPress={() => handleSimulateScan(manualCode)}
                  style={styles.verifyBtn}
                >
                  <Text style={styles.verifyBtnText}>Verify</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          /* Scanned Result Summary Card */
          <View style={styles.resultCard}>
            <View
              style={[
                styles.resultStatusBanner,
                scannedResult.status === "VALID" ? styles.bannerValid : styles.bannerInvalid,
              ]}
            >
              <Text style={styles.bannerText}>
                {scannedResult.status === "VALID" ? "✅ PASS APPROVED & VALID" : "⛔ RESTRICTED / BLACKLISTED"}
              </Text>
            </View>

            <View style={styles.resultBody}>
              <Text style={styles.resultVisitorName}>{scannedResult.visitor}</Text>
              <Text style={styles.resultMeta}>{scannedResult.type} • {scannedResult.phone}</Text>

              <View style={styles.resultGrid}>
                <View style={styles.resultTile}>
                  <Text style={styles.tileLabel}>Destination Flat:</Text>
                  <Text style={styles.tileVal}>{scannedResult.unit}</Text>
                </View>
                <View style={styles.resultTile}>
                  <Text style={styles.tileLabel}>Vehicle Plate:</Text>
                  <Text style={styles.tileVal}>{scannedResult.vehicle}</Text>
                </View>
              </View>
            </View>

            {scannedResult.status === "VALID" ? (
              <TouchableOpacity
                onPress={handleConfirmCheckIn}
                style={styles.checkInBtn}
              >
                <Text style={styles.checkInBtnText}>ALLOW ENTRY & CHECK-IN</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => Alert.alert("Gate Locked", "Blacklisted entry locked. Contact estate supervisor.")}
                style={styles.denyBtn}
              >
                <Text style={styles.denyBtnText}>DENY ENTRY (GATE LOCKED)</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setScannedResult(null)}
              style={styles.rescanBtn}
            >
              <Text style={styles.rescanBtnText}>Scan Another Pass</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
    color: "#ffffff",
  },
  content: {
    padding: 20,
    gap: 20,
    alignItems: "center",
  },
  scannerFrame: {
    width: "100%",
    height: 300,
    backgroundColor: "#1e293b",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#334155",
    position: "relative",
  },
  reticleCornerTL: {
    position: "absolute",
    top: 20,
    left: 20,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: Colors.primary,
  },
  reticleCornerTR: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: Colors.primary,
  },
  reticleCornerBL: {
    position: "absolute",
    bottom: 20,
    left: 20,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: Colors.primary,
  },
  reticleCornerBR: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: Colors.primary,
  },
  scanPromptText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
  testScanBtn: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  testScanText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  manualCard: {
    width: "100%",
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 10,
  },
  manualTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
  },
  manualInput: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#ffffff",
    fontFamily: "monospace",
    fontSize: 13,
  },
  verifyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 12,
  },
  verifyBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  resultCard: {
    width: "100%",
    backgroundColor: "#1e293b",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#334155",
    overflow: "hidden",
  },
  resultStatusBanner: {
    paddingVertical: 12,
    alignItems: "center",
  },
  bannerValid: {
    backgroundColor: "#10b981",
  },
  bannerInvalid: {
    backgroundColor: "#e11d48",
  },
  bannerText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  resultBody: {
    padding: 20,
    gap: 12,
  },
  resultVisitorName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
  },
  resultMeta: {
    fontSize: 13,
    color: "#94a3b8",
  },
  resultGrid: {
    gap: 8,
    marginTop: 8,
  },
  resultTile: {
    backgroundColor: "#0f172a",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  tileLabel: {
    fontSize: 11,
    color: "#64748b",
  },
  tileVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
    marginTop: 2,
  },
  checkInBtn: {
    marginHorizontal: 20,
    backgroundColor: "#10b981",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  checkInBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  denyBtn: {
    marginHorizontal: 20,
    backgroundColor: "#e11d48",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  denyBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  rescanBtn: {
    paddingVertical: 16,
    alignItems: "center",
  },
  rescanBtnText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
});
