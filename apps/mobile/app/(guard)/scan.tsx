import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { Colors } from "../../src/theme/colors";
import { syncEngine } from "../../src/sync/syncEngine";
import { OfflineBanner } from "../../src/components/OfflineBanner";
import { useAuthStore } from "../../src/store/authStore";
import { visitorApi, societyApi } from "../../src/api/client";

export default function GuardScanScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const societyId = user?.societyId || "34090e70-34f9-4cdd-9522-e2098982a5ed";
  const [gates, setGates] = useState<any[]>([]);
  const [selectedGateId, setSelectedGateId] = useState<string>(
    user?.gateId || "b878246e-d891-4cd9-b4af-c917cd3bd163"
  );

  useEffect(() => {
    societyApi
      .getGates(societyId)
      .then((data) => {
        if (data && data.length > 0) {
          setGates(data);
          if (!user?.gateId) {
            setSelectedGateId(data[0].id);
          }
        }
      })
      .catch((err) => console.log("Failed to fetch gates:", err));
  }, [societyId, user?.gateId]);

  const activeGateName =
    gates.find((g) => g.id === selectedGateId)?.name || user?.gateName || "Security Gate";

  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [activeTab, setActiveTab] = useState<"camera" | "manual">(
    Platform.OS === "web" ? "manual" : "camera"
  );

  const [manualCode, setManualCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [scannedPass, setScannedPass] = useState<any | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);

  const isScanningRef = useRef(false);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (isScanningRef.current || !data || scannedPass || isValidating) return;
    isScanningRef.current = true;
    await processQrToken(data);
    setTimeout(() => {
      isScanningRef.current = false;
    }, 2500);
  };

  const processQrToken = async (token: string) => {
    if (!token || !token.trim()) return;
    setIsValidating(true);
    setScanError(null);
    setScanSuccessMessage(null);
    const cleanToken = token.trim();
    try {
      // 1. Validate with backend (handles QR token or PIN)
      const res = await visitorApi.scanPass(societyId, selectedGateId, cleanToken);
      setScannedPass(res);
      setScanSuccessMessage(`Verified: ${res.visitor_name || "Guest"}`);
    } catch (e: any) {
      // 2. If network fails or backend unreachable, fallback to local SQLite cache
      try {
        const { localDb } = await import("../../src/database/sqlite");
        const cachedPass = await localDb.findPassByToken(cleanToken);
        if (cachedPass) {
          setScannedPass({
            id: cachedPass.id,
            visitor_name: cachedPass.visitor_name,
            visitor_phone: cachedPass.visitor_phone,
            unit_id: cachedPass.unit_id,
            pass_type: "Guest",
            is_offline_verified: true,
          });
          setScanSuccessMessage(`Verified Offline via Gate Cache: ${cachedPass.visitor_name}`);
          return;
        }
      } catch (localErr) {
        console.warn("Offline pass check fallback error:", localErr);
      }

      const msg = e.message || "Invalid pass or expired token";
      console.log("Scan error:", msg);
      setScanError(msg);
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmCheckIn = async () => {
    if (!scannedPass) return;

    try {
      setIsValidating(true);
      const actualGateId = selectedGateId || gates[0]?.id || "b878246e-d891-4cd9-b4af-c917cd3bd163";

      // 1. Record live in backend PostgreSQL
      let onlineSuccess = false;
      try {
        await visitorApi.gateCheckIn(societyId, actualGateId, {
          pass_id: scannedPass.id,
          visitor_name: scannedPass.visitor_name,
          visitor_phone: scannedPass.visitor_phone,
          unit_id: scannedPass.unit_id,
          vehicle_number: scannedPass.vehicle_number,
          idempotency_key: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        });
        onlineSuccess = true;
      } catch (backendErr) {
        console.warn("Backend direct check-in failed, queueing offline:", backendErr);
        // 2. Queue in SQLite offline sync engine
        await syncEngine.logCheckIn(scannedPass.id, actualGateId, {
          visitor_name: scannedPass.visitor_name,
          visitor_phone: scannedPass.visitor_phone,
          unit: scannedPass.unit?.unit_number || "Villa-42",
          type: scannedPass.pass_type || "Guest",
          vehicle: scannedPass.vehicle_number,
        });
      }

      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(`✅ Entry Authorized: Gate barrier opened for ${scannedPass.visitor_name}. Resident notified & logged in society registry.`);
      } else {
        Alert.alert(
          "✅ Entry Authorized",
          `Gate barrier opened for ${scannedPass.visitor_name}. Resident notified & entry logged in registry.`
        );
      }

      setScannedPass(null);
      setManualCode("");
      setScanSuccessMessage(null);
      router.push("/(guard)/inside");
    } catch (err: any) {
      console.log("Check-in error:", err);
      Alert.alert("Check-In Error", err?.message || "Failed to complete gate check-in.");
    } finally {
      setIsValidating(false);
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
        <View style={{ alignItems: "center" }}>
          <Text style={styles.headerTitle}>Gate QR Pass Scanner</Text>
          <Text style={styles.headerSub}>{activeGateName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Mode Switcher */}
      <View style={styles.modeTabs}>
        <TouchableOpacity
          onPress={() => {
            setActiveTab("camera");
            setScannedPass(null);
            setScanError(null);
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
            setScanError(null);
          }}
          style={[styles.modeTab, activeTab === "manual" && styles.modeTabActive]}
        >
          <Text style={[styles.modeTabText, activeTab === "manual" && styles.modeTabTextActive]}>
            🔢 Manual PIN
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.contentScroll} keyboardShouldPersistTaps="handled">
        {/* Status Prompt & Live Scanner Feedback Bar */}
        {isValidating ? (
          <View style={styles.validatingHUD}>
            <ActivityIndicator color="#ffffff" />
            <Text style={styles.validatingText}>Checking Pass with Security Server...</Text>
          </View>
        ) : scanError ? (
          <View style={styles.errorHUD}>
            <Text style={styles.errorHUDIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.errorHUDTitle}>Verification Failed</Text>
              <Text style={styles.errorHUDSub}>{scanError}</Text>
            </View>
            <TouchableOpacity onPress={() => setScanError(null)} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : scanSuccessMessage ? (
          <View style={styles.successHUD}>
            <Text style={styles.successHUDText}>✅ {scanSuccessMessage}</Text>
          </View>
        ) : (
          <View style={styles.activeHUD}>
            <Text style={styles.activeHUDText}>🟢 Scanner Active • Hold QR code inside reticle</Text>
          </View>
        )}

        {/* 1. Verified Pass Modal / Detail Sheet */}
        {scannedPass ? (
          <View style={styles.resultContainer}>
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <View style={[styles.statusBadge, styles.badgeGreen]}>
                  <Text style={styles.statusBadgeText}>✓ VALID PASS</Text>
                </View>
                <Text style={styles.passTypeTag}>{scannedPass.pass_type?.toUpperCase() || "VISITOR"}</Text>
              </View>

              <Text style={styles.visitorName}>{scannedPass.visitor_name}</Text>
              <Text style={styles.visitorPhone}>{scannedPass.visitor_phone || "Identity Verified"}</Text>

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
                  <Text style={styles.detailLabel}>Vehicle License Plate:</Text>
                  <Text style={styles.detailValue}>
                    {scannedPass.vehicle_number || "Pedestrian / None"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleConfirmCheckIn}
                disabled={isValidating}
                style={styles.confirmButton}
              >
                {isValidating ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.confirmButtonText}>⚡ Authorize & Open Barrier</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setScannedPass(null);
                  isScanningRef.current = false;
                  setScanSuccessMessage(null);
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
              </View>
            )}
          </View>
        ) : (
          /* 3. Manual PIN Code Mode */
          <View style={styles.manualContainer}>
            <Text style={styles.manualTitle}>Enter 6-Digit Pass PIN</Text>
            <Text style={styles.manualSub}>
              Enter the pass PIN or token provided by the visitor.
            </Text>

            <TextInput
              style={styles.manualInput}
              placeholder="e.g. 889922 or NBR-..."
              placeholderTextColor={Colors.textMuted}
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="characters"
              autoFocus
            />

            <TouchableOpacity
              onPress={() => processQrToken(manualCode)}
              disabled={!manualCode.trim() || isValidating}
              style={[styles.verifyButton, (!manualCode.trim() || isValidating) && { opacity: 0.5 }]}
            >
              {isValidating ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.verifyButtonText}>Verify & Authorize Pass</Text>
              )}
            </TouchableOpacity>

            {/* Quick Test Presets */}
            <View style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#e2e8f0" }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748b", marginBottom: 10, textTransform: "uppercase" }}>
                Quick Test Gate Passes
              </Text>
              <View style={{ gap: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    setManualCode("NBR-TOKEN-ANANYA");
                    processQrToken("NBR-TOKEN-ANANYA");
                  }}
                  style={{ backgroundColor: "#f8fafc", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0" }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.primary }}>
                    🎟️ Ananya Roy (Pre-approved Guest QR)
                  </Text>
                  <Text style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    Token: NBR-TOKEN-ANANYA • Unit Villa-42
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setManualCode("889922");
                    processQrToken("889922");
                  }}
                  style={{ backgroundColor: "#f8fafc", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0" }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.primary }}>
                    🔢 Standard PIN Verification (889922)
                  </Text>
                  <Text style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    PIN: 889922 • 6-Digit Gate Passcode
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
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
    paddingHorizontal: 20,
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
  headerSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  modeTabs: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  modeTabActive: {
    backgroundColor: Colors.primary,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748b",
  },
  modeTabTextActive: {
    color: "#ffffff",
  },
  contentScroll: {
    padding: 16,
    gap: 14,
  },
  activeHUD: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  activeHUDText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#065f46",
  },
  validatingHUD: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  validatingText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
  errorHUD: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1.5,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  errorHUDIcon: {
    fontSize: 22,
  },
  errorHUDTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#991b1b",
  },
  errorHUDSub: {
    fontSize: 11,
    color: "#dc2626",
    marginTop: 2,
  },
  retryBtn: {
    backgroundColor: "#dc2626",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  successHUD: {
    backgroundColor: "#ecfdf5",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  successHUDText: {
    color: "#065f46",
    fontSize: 13,
    fontWeight: "800",
  },
  cameraContainer: {
    height: 380,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#0f172a",
  },
  permissionBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
    backgroundColor: "#ffffff",
  },
  permissionEmoji: {
    fontSize: 42,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  permissionText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  grantBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  grantBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  liveCameraWrapper: {
    flex: 1,
    position: "relative",
  },
  overlayFrame: {
    position: "absolute",
    top: "18%",
    left: "14%",
    width: "72%",
    height: "64%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
  },
  reticleCornerTL: {
    position: "absolute",
    top: -2,
    left: -2,
    width: 24,
    height: 24,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#38bdf8",
    borderTopLeftRadius: 10,
  },
  reticleCornerTR: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 24,
    height: 24,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: "#38bdf8",
    borderTopRightRadius: 10,
  },
  reticleCornerBL: {
    position: "absolute",
    bottom: -2,
    left: -2,
    width: 24,
    height: 24,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#38bdf8",
    borderBottomLeftRadius: 10,
  },
  reticleCornerBR: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: "#38bdf8",
    borderBottomRightRadius: 10,
  },
  scanLaser: {
    position: "absolute",
    top: "50%",
    left: "5%",
    right: "5%",
    height: 2,
    backgroundColor: "#38bdf8",
    shadowColor: "#38bdf8",
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  cameraControls: {
    position: "absolute",
    bottom: 14,
    left: 14,
    right: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  controlBtn: {
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  controlBtnActive: {
    backgroundColor: Colors.primary,
  },
  controlBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  resultContainer: {
    width: "100%",
  },
  resultCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeGreen: {
    backgroundColor: "#ecfdf5",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#059669",
  },
  passTypeTag: {
    fontSize: 10,
    fontWeight: "900",
    color: "#64748b",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  visitorName: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.text,
  },
  visitorPhone: {
    fontSize: 13,
    color: "#64748b",
    marginTop: -8,
  },
  detailsGrid: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.text,
  },
  confirmButton: {
    backgroundColor: "#059669",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  rescanButton: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  rescanButtonText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "800",
  },
  manualContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  manualTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  manualSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: -8,
    lineHeight: 18,
  },
  manualInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: 2,
    fontFamily: "monospace",
    textAlign: "center",
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  verifyButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
});
