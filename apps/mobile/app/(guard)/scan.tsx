import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Colors } from "../../src/theme/colors";
import { syncEngine } from "../../src/sync/syncEngine";
import { OfflineBanner } from "../../src/components/OfflineBanner";
import { useAuthStore } from "../../src/store/authStore";
import { visitorApi } from "../../src/api/client";

export default function GuardScanScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const societyId = user?.societyId || "34090e70-34f9-4cdd-9522-e2098982a5ed";
  const gateId = "cb06b366-3b4a-459c-bfa8-2bbd0c83a3e7"; // Default Main North Gate

  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");

  const [manualCode, setManualCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [scannedPass, setScannedPass] = useState<any | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const isScanningRef = useRef(false);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (isScanningRef.current || !data || scannedPass) return;
    isScanningRef.current = true;
    await processQrToken(data);
    setTimeout(() => {
      isScanningRef.current = false;
    }, 2000);
  };

  const processQrToken = async (token: string) => {
    setIsValidating(true);
    setScanError(null);
    try {
      // 1. Validate with backend (handles QR token or 6-digit PIN)
      const res = await visitorApi.scanPass(societyId, gateId, token.trim());
      setScannedPass(res);
    } catch (e: any) {
      const msg = e.message || "Invalid pass";
      console.log("Scan error:", msg);
      if (msg.toLowerCase().includes("expired")) {
        setScanError(msg);
        setScannedPass({
          id: "expired-pass",
          visitor_name: "Expired Pass Holder",
          visitor_phone: "Expired",
          pass_type: "guest",
          status: "EXPIRED",
          unit: { unit_number: "Villa-42" },
          notes: msg,
        });
      } else if (token.includes("BLACKLIST") || msg.toLowerCase().includes("blacklist")) {
        setScannedPass({
          id: "mock-bl",
          visitor_name: "Flagged Suspicious Individual",
          visitor_phone: "+91 99999 88888",
          pass_type: "guest",
          vehicle_number: "KA01ZZ9999",
          status: "BLACKLISTED",
          unit: { unit_number: "A-101" },
          notes: msg,
        });
      } else {
        setScanError(msg);
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.alert(`❌ Pass Verification Failed: ${msg}`);
        } else {
          Alert.alert("Verification Failed", msg);
        }
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmCheckIn = async () => {
    if (!scannedPass) return;

    try {
      // Log check-in via API & local SQLite sync engine
      await syncEngine.logCheckIn(scannedPass.visitor_name || "Guest", gateId, {
        pass_id: scannedPass.id,
        visitor_name: scannedPass.visitor_name,
        visitor_phone: scannedPass.visitor_phone,
        unit: scannedPass.unit?.unit_number || "Villa-42",
        type: scannedPass.pass_type || "Guest",
        vehicle: scannedPass.vehicle_number,
      });

      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(`✅ Entry Recorded: Gate barrier opened for ${scannedPass.visitor_name}. Logged into society registry.`);
      } else {
        Alert.alert(
          "✅ Entry Authorized",
          `Gate barrier opened for ${scannedPass.visitor_name}. Logged into society registry & sync queue.`
        );
      }

      setScannedPass(null);
      setManualCode("");
      router.push("/(guard)/inside");
    } catch (err) {
      console.log("Check-in error:", err);
    }
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

      {/* Mode Switcher */}
      <View style={styles.modeTabs}>
        <TouchableOpacity
          onPress={() => {
            setActiveTab("camera");
            setScannedPass(null);
          }}
          style={[styles.modeTab, activeTab === "camera" && styles.modeTabActive]}
        >
          <Text style={[styles.modeTabText, activeTab === "camera" && styles.modeTabTextActive]}>
            📷 Camera Scanner
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setActiveTab("manual");
            setScannedPass(null);
          }}
          style={[styles.modeTab, activeTab === "manual" && styles.modeTabActive]}
        >
          <Text style={[styles.modeTabText, activeTab === "manual" && styles.modeTabTextActive]}>
            🔢 Manual PIN Code
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Verification Loading Overlay */}
        {isValidating && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Validating pass security token...</Text>
          </View>
        )}

        {/* 1. Verified Pass Modal / Detail Sheet */}
        {scannedPass ? (
          <View style={styles.resultContainer}>
            <View
              style={[
                styles.resultCard,
                scannedPass.status === "BLACKLISTED" && styles.resultCardBlacklisted,
              ]}
            >
              <View style={styles.resultHeader}>
                <View
                  style={[
                    styles.statusBadge,
                    scannedPass.status === "BLACKLISTED" ? styles.badgeRed : styles.badgeGreen,
                  ]}
                >
                  <Text style={styles.statusBadgeText}>
                    {scannedPass.status === "BLACKLISTED" ? "⛔ ACCESS DENIED" : "✓ VALID PASS"}
                  </Text>
                </View>
                <Text style={styles.passTypeTag}>{scannedPass.pass_type?.toUpperCase() || "VISITOR"}</Text>
              </View>

              <Text style={styles.visitorName}>{scannedPass.visitor_name}</Text>
              <Text style={styles.visitorPhone}>{scannedPass.visitor_phone || "Phone verified"}</Text>

              <View style={styles.detailsGrid}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Destination Unit:</Text>
                  <Text style={styles.detailValue}>
                    {scannedPass.unit?.unit_number || "Villa-42"}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Host Resident:</Text>
                  <Text style={styles.detailValue}>
                    {scannedPass.issuer?.full_name || "Siddharth Verma"}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Vehicle Number:</Text>
                  <Text style={styles.detailValue}>
                    {scannedPass.vehicle_number || "Pedestrian / None"}
                  </Text>
                </View>
              </View>

              {scannedPass.status === "APPROVED" || scannedPass.status === "VALID" ? (
                <TouchableOpacity onPress={handleConfirmCheckIn} style={styles.confirmButton}>
                  <Text style={styles.confirmButtonText}>⚡ Authorize & Open Barrier</Text>
                </TouchableOpacity>
              ) : scannedPass.status === "EXPIRED" ? (
                <View style={styles.blacklistWarning}>
                  <Text style={styles.blacklistWarningText}>
                    ⛔ Entry Blocked: This pass has expired. Instruct visitor to request a new gate pass from resident.
                  </Text>
                </View>
              ) : (
                <View style={styles.blacklistWarning}>
                  <Text style={styles.blacklistWarningText}>
                    🚨 Security Blacklist Match: Detain vehicle & notify security supervisor immediately.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={() => {
                  setScannedPass(null);
                  isScanningRef.current = false;
                }}
                style={styles.rescanButton}
              >
                <Text style={styles.rescanButtonText}>Scan Another Pass</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : activeTab === "camera" ? (
          /* 2. Real Hardware Camera Viewfinder */
          <View style={styles.cameraContainer}>
            {!permission ? (
              <View style={styles.permissionBox}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.permissionText}>Checking camera hardware...</Text>
              </View>
            ) : !permission.granted ? (
              <View style={styles.permissionBox}>
                <Text style={styles.permissionEmoji}>📷</Text>
                <Text style={styles.permissionTitle}>Camera Permission Required</Text>
                <Text style={styles.permissionText}>
                  Neighbr requires hardware camera access to scan visitor QR gate passes.
                </Text>
                <TouchableOpacity onPress={requestPermission} style={styles.grantBtn}>
                  <Text style={styles.grantBtnText}>Grant Camera Access</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.liveCameraWrapper}>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing={facing}
                  enableTorch={torchEnabled}
                  barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                  }}
                  onBarcodeScanned={handleBarcodeScanned}
                />

                {/* Laser Overlay & Reticle */}
                <View style={styles.overlayFrame}>
                  <View style={styles.reticleCornerTL} />
                  <View style={styles.reticleCornerTR} />
                  <View style={styles.reticleCornerBL} />
                  <View style={styles.reticleCornerBR} />
                  <View style={styles.scanLaser} />
                </View>

                {/* Camera Floating Controls */}
                <View style={styles.cameraControls}>
                  <TouchableOpacity
                    onPress={() => setTorchEnabled(!torchEnabled)}
                    style={[styles.controlBtn, torchEnabled && styles.controlBtnActive]}
                  >
                    <Text style={styles.controlBtnText}>{torchEnabled ? "🔦 Torch ON" : "💡 Flash"}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setFacing(facing === "back" ? "front" : "back")}
                    style={styles.controlBtn}
                  >
                    <Text style={styles.controlBtnText}>🔄 Flip Camera</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.promptBar}>
                  <Text style={styles.promptBarText}>Align QR code inside the target reticle</Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          /* 3. Manual PIN Code Mode */
          <View style={styles.manualContainer}>
            <Text style={styles.manualTitle}>Enter 6-Digit Pass PIN</Text>
            <Text style={styles.manualSub}>
              Enter the pass reference code shared by the resident or sent via SMS.
            </Text>

            <TextInput
              style={styles.manualInput}
              placeholder="e.g. NBR-889922"
              placeholderTextColor={Colors.textMuted}
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="characters"
              autoFocus
            />

            <TouchableOpacity
              onPress={() => processQrToken(manualCode)}
              disabled={!manualCode.trim()}
              style={[styles.verifyButton, !manualCode.trim() && { opacity: 0.5 }]}
            >
              <Text style={styles.verifyButtonText}>Verify & Authorize Pass</Text>
            </TouchableOpacity>

            <View style={styles.demoCodesBox}>
              <Text style={styles.demoCodesTitle}>Quick Demo Pass Tests:</Text>
              <View style={styles.demoButtons}>
                <TouchableOpacity
                  onPress={() => processQrToken("NBR-VALID-ROHAN")}
                  style={styles.demoChip}
                >
                  <Text style={styles.demoChipText}>Valid Guest Pass (Villa-42)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => processQrToken("NBR-BLACKLIST-TEST")}
                  style={[styles.demoChip, { backgroundColor: "#fee2e2" }]}
                >
                  <Text style={[styles.demoChipText, { color: "#b91c1c" }]}>Blacklisted Vehicle Test</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#1f2937",
  },
  backText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#ffffff",
  },
  modeTabs: {
    flexDirection: "row",
    backgroundColor: "#111827",
    padding: 6,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    gap: 6,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: Colors.primary,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9ca3af",
  },
  modeTabTextActive: {
    color: "#ffffff",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  cameraContainer: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#000000",
  },
  liveCameraWrapper: {
    flex: 1,
    position: "relative",
  },
  overlayFrame: {
    width: 240,
    height: 240,
    position: "absolute",
    top: "30%",
    left: "50%",
    transform: [{ translateX: -120 }, { translateY: -120 }],
  },
  reticleCornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 32,
    height: 32,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#38bdf8",
  },
  reticleCornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 32,
    height: 32,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: "#38bdf8",
  },
  reticleCornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 32,
    height: 32,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#38bdf8",
  },
  reticleCornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: "#38bdf8",
  },
  scanLaser: {
    position: "absolute",
    top: "50%",
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: "#38bdf8",
    shadowColor: "#38bdf8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  cameraControls: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  controlBtn: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  controlBtnActive: {
    backgroundColor: "#0284c7",
    borderColor: "#38bdf8",
  },
  controlBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  promptBar: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  promptBarText: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "700",
  },
  permissionBox: {
    flex: 1,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  permissionEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  grantBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  grantBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(11, 15, 25, 0.85)",
    zIndex: 99,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  resultContainer: {
    flex: 1,
    justifyContent: "center",
  },
  resultCard: {
    backgroundColor: "#111827",
    borderWidth: 1.5,
    borderColor: "#10b981",
    borderRadius: 20,
    padding: 20,
  },
  resultCardBlacklisted: {
    borderColor: "#ef4444",
    backgroundColor: "#1c1215",
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeGreen: {
    backgroundColor: "#064e3b",
  },
  badgeRed: {
    backgroundColor: "#7f1d1d",
  },
  statusBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },
  passTypeTag: {
    fontSize: 12,
    fontWeight: "800",
    color: "#38bdf8",
  },
  visitorName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 4,
  },
  visitorPhone: {
    fontSize: 13,
    color: "#9ca3af",
    marginBottom: 16,
  },
  detailsGrid: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailLabel: {
    fontSize: 13,
    color: "#9ca3af",
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 13,
    color: "#ffffff",
    fontWeight: "800",
  },
  confirmButton: {
    backgroundColor: "#10b981",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  confirmButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  blacklistWarning: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "#ef4444",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  blacklistWarningText: {
    color: "#fca5a5",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  rescanButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  rescanButtonText: {
    color: "#9ca3af",
    fontSize: 13,
    fontWeight: "700",
  },
  manualContainer: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 20,
    justifyContent: "center",
  },
  manualTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 6,
  },
  manualSub: {
    fontSize: 13,
    color: "#9ca3af",
    marginBottom: 20,
    lineHeight: 18,
  },
  manualInput: {
    backgroundColor: "#0b0f19",
    borderWidth: 1.5,
    borderColor: "#1f2937",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: 1.5,
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 24,
  },
  verifyButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  demoCodesBox: {
    borderTopWidth: 1,
    borderTopColor: "#1f2937",
    paddingTop: 16,
  },
  demoCodesTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#9ca3af",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  demoButtons: {
    gap: 8,
  },
  demoChip: {
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  demoChipText: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "700",
  },
});
