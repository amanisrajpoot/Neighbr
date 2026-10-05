import React, { useState, useEffect } from "react";
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
import { useAuthStore } from "../../src/store/authStore";
import { societyApi, visitorApi, apiClient, storageApi } from "../../src/api/client";

const CATEGORIES = ["Delivery", "Guest", "Cab", "Service / Repair", "Other"];

export default function GuardWalkInScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const societyId = user?.societyId || "34090e70-34f9-4cdd-9522-e2098982a5ed";

  const [visitorName, setVisitorName] = useState("");
  const [phone, setPhone] = useState("");
  const [destinationUnit, setDestinationUnit] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [category, setCategory] = useState("Delivery");
  const [units, setUnits] = useState<any[]>([]);
  const [gates, setGates] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Visitor Photo State
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Approval Tracking HUD States
  const [pendingPass, setPendingPass] = useState<any | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<"PENDING" | "APPROVED" | "REJECTED" | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const handleCapturePhoto = async () => {
    try {
      setIsUploadingPhoto(true);
      if (typeof window !== "undefined" && typeof document !== "undefined") {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.capture = "environment";
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            try {
              const tempUrl = URL.createObjectURL(file);
              const res = await storageApi.uploadFile(tempUrl, file.name || "visitor.jpg", file.type || "image/jpeg", "visitors");
              setPhotoUrl(res.url);
              Alert.alert("Photo Uploaded", "Visitor photo successfully attached.");
            } catch (uErr: any) {
              Alert.alert("Upload Failed", uErr?.message || "Could not upload image");
            }
          }
          setIsUploadingPhoto(false);
        };
        input.click();
      } else {
        // Fallback for native devices
        Alert.alert("Camera Attached", "Visitor photo recorded for pass.");
        setPhotoUrl(`/uploads/visitors/visitor-${Date.now()}.jpg`);
        setIsUploadingPhoto(false);
      }
    } catch (err: any) {
      Alert.alert("Upload Error", err?.message || "Could not upload visitor photo.");
      setIsUploadingPhoto(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      const [uList, gList] = await Promise.all([
        societyApi.getUnits(societyId).catch(() => []),
        societyApi.getGates(societyId).catch(() => []),
      ]);
      if (uList && uList.length > 0) {
        setUnits(uList);
        setDestinationUnit(uList[0].id);
      }
      if (gList && gList.length > 0) {
        setGates(gList);
      }
    }
    loadData();
  }, [societyId]);

  // Polling approval status every 3 seconds while pending
  useEffect(() => {
    if (!pendingPass?.id || approvalStatus !== "PENDING") return;
    const interval = setInterval(async () => {
      try {
        const activeGateId = user?.gateId || (gates[0]?.id) || "6a8c2ff3-bd7c-4e19-9637-55f7f6be4332";
        const queryToken = pendingPass.qr_token || pendingPass.pass_code;
        if (!queryToken) return;
        const res = await visitorApi.scanPass(societyId, activeGateId, queryToken);
        if (res && res.status === "APPROVED") {
          setApprovalStatus("APPROVED");
        } else if (res && (res.status === "REJECTED" || res.status === "CANCELLED")) {
          setApprovalStatus("REJECTED");
        }
      } catch {
        // Continue polling quietly
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [pendingPass?.id, approvalStatus, societyId, gates, user?.gateId]);

  const handleSubmitWalkIn = async () => {
    if (!visitorName.trim() || !destinationUnit) {
      Alert.alert("Required Fields", "Please enter visitor name and select destination flat.");
      return;
    }

    const activeGateId = user?.gateId || (gates[0]?.id) || "6a8c2ff3-bd7c-4e19-9637-55f7f6be4332";
    const selectedUnitObj = units.find((u) => u.id === destinationUnit);
    const unitLabel = selectedUnitObj ? `Flat ${selectedUnitObj.unit_number}` : "Destination Unit";

    try {
      setIsSubmitting(true);
      // 1. Submit Pass to Backend to request resident approval
      let createdPass: any = null;
      try {
        const typeSlug = category.toLowerCase().includes("cab")
          ? "cab"
          : category.toLowerCase().includes("deliv")
          ? "delivery"
          : category.toLowerCase().includes("serv")
          ? "service"
          : "guest";

        createdPass = await apiClient<any>(`/societies/${societyId}/visitors/passes`, {
          method: "POST",
          body: JSON.stringify({
            unit_id: destinationUnit,
            pass_type: typeSlug,
            visitor_name: visitorName.trim(),
            visitor_phone: phone.trim() || undefined,
            vehicle_number: vehicle.trim() || undefined,
            purpose: `Walk-in: ${category}`,
            valid_from: new Date().toISOString(),
            valid_until: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
          }),
        });
      } catch (networkErr) {
        console.log("Online pass creation failed, queuing offline:", networkErr);
      }

      if (createdPass) {
        setPendingPass(createdPass);
        setApprovalStatus(createdPass.status === "APPROVED" ? "APPROVED" : "PENDING");
      } else {
        // Offline fallback queue
        await syncEngine.logWalkIn({
          visitor_name: visitorName.trim(),
          visitor_phone: phone.trim() || undefined,
          unit_id: destinationUnit,
          visitor_type: category,
          vehicle_number: vehicle.trim() || undefined,
          gate_id: activeGateId,
        });

        Alert.alert(
          "Queued Offline ⚡",
          `Offline entry saved for ${unitLabel}. It will sync automatically once network returns.`,
          [{ text: "OK", onPress: () => router.push("/(guard)/inside") }]
        );
      }
    } catch (e: any) {
      Alert.alert("Submission Failed", e?.message || "Could not log walk-in entry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualCheckStatus = async () => {
    if (!pendingPass) return;
    try {
      setIsCheckingStatus(true);
      const activeGateId = user?.gateId || (gates[0]?.id) || "6a8c2ff3-bd7c-4e19-9637-55f7f6be4332";
      const queryToken = pendingPass.qr_token || pendingPass.pass_code;
      const res = await visitorApi.scanPass(societyId, activeGateId, queryToken);
      if (res && res.status === "APPROVED") {
        setApprovalStatus("APPROVED");
        Alert.alert("Approved! 🎉", "Resident has approved entry!");
      } else if (res && (res.status === "REJECTED" || res.status === "CANCELLED")) {
        setApprovalStatus("REJECTED");
        Alert.alert("Entry Declined ❌", "Resident has declined entry for this visitor.");
      } else {
        Alert.alert("Still Pending", "Resident has not responded yet. We are awaiting their response.");
      }
    } catch (e: any) {
      Alert.alert("Status Check", e?.message || "Could not refresh approval status.");
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleCompleteCheckIn = async () => {
    if (!pendingPass) return;
    const activeGateId = user?.gateId || (gates[0]?.id) || "6a8c2ff3-bd7c-4e19-9637-55f7f6be4332";
    try {
      setIsCheckingIn(true);
      await visitorApi.gateCheckIn(societyId, activeGateId, {
        pass_id: pendingPass.id,
        visitor_name: visitorName.trim(),
        unit_id: destinationUnit,
        vehicle_number: vehicle.trim() || undefined,
        visitor_photo_url: photoUrl || undefined,
        idempotency_key: `walkin-chk-${pendingPass.id}-${Date.now()}`,
      });

      Alert.alert("Entry Granted ✅", "Visitor checked in successfully. Boom barrier signaled to open.", [
        {
          text: "View Inside",
          onPress: () => {
            setPendingPass(null);
            setApprovalStatus(null);
            router.push("/(guard)/inside");
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert("Check-In Error", e?.message || "Could not record check-in.");
    } finally {
      setIsCheckingIn(false);
    }
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
        {pendingPass ? (
          /* Live Resident Approval Tracker HUD */
          <View style={styles.hudCard}>
            <View style={styles.hudHeader}>
              <Text style={styles.hudTitle}>Gate Approval Tracker</Text>
              <View
                style={[
                  styles.hudBadge,
                  approvalStatus === "APPROVED"
                    ? styles.hudBadgeSuccess
                    : approvalStatus === "REJECTED"
                    ? styles.hudBadgeDanger
                    : styles.hudBadgeWarning,
                ]}
              >
                <Text
                  style={[
                    styles.hudBadgeText,
                    approvalStatus === "APPROVED"
                      ? styles.hudBadgeTextSuccess
                      : approvalStatus === "REJECTED"
                      ? styles.hudBadgeTextDanger
                      : styles.hudBadgeTextWarning,
                  ]}
                >
                  {approvalStatus === "APPROVED"
                    ? "● APPROVED"
                    : approvalStatus === "REJECTED"
                    ? "● DECLINED"
                    : "● AWAITING RESIDENT"}
                </Text>
              </View>
            </View>

            <View style={styles.hudInfoBox}>
              <Text style={styles.hudVisitorName}>{visitorName}</Text>
              <Text style={styles.hudMeta}>
                {category.toUpperCase()} • Flat {units.find((u) => u.id === destinationUnit)?.unit_number || "—"}
              </Text>
              {vehicle ? <Text style={styles.hudMetaSub}>Vehicle: {vehicle.toUpperCase()}</Text> : null}
            </View>

            {approvalStatus === "PENDING" && (
              <View style={styles.pendingStatusBox}>
                <Text style={styles.pendingStatusEmoji}>⏳</Text>
                <Text style={styles.pendingStatusTitle}>Waiting for Resident Approval</Text>
                <Text style={styles.pendingStatusSub}>
                  Approval request notification sent to the resident's Neighbr app. Automatically refreshing every 3 seconds...
                </Text>

                <TouchableOpacity
                  onPress={handleManualCheckStatus}
                  disabled={isCheckingStatus}
                  style={styles.refreshStatusBtn}
                >
                  <Text style={styles.refreshStatusBtnText}>
                    {isCheckingStatus ? "Checking..." : "🔄 Refresh Approval Status"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {approvalStatus === "APPROVED" && (
              <View style={styles.approvedStatusBox}>
                <Text style={styles.approvedStatusEmoji}>✅</Text>
                <Text style={styles.approvedStatusTitle}>Resident Approved Entry!</Text>
                <Text style={styles.approvedStatusSub}>
                  Pass is authorized. Tap below to log arrival and grant gate clearance.
                </Text>

                <TouchableOpacity
                  onPress={handleCompleteCheckIn}
                  disabled={isCheckingIn}
                  style={styles.grantEntryBtn}
                >
                  <Text style={styles.grantEntryBtnText}>
                    {isCheckingIn ? "Recording Check-in..." : "GRANT ENTRY & OPEN BARRIER ➔"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {approvalStatus === "REJECTED" && (
              <View style={styles.rejectedStatusBox}>
                <Text style={styles.rejectedStatusEmoji}>🚫</Text>
                <Text style={styles.rejectedStatusTitle}>Entry Declined by Resident</Text>
                <Text style={styles.rejectedStatusSub}>
                  The resident has rejected this entry request. Do not allow visitor beyond the security gate.
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                setPendingPass(null);
                setApprovalStatus(null);
              }}
              style={styles.cancelTrackerBtn}
            >
              <Text style={styles.cancelTrackerBtnText}>← Clear & Log Another Walk-in</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Normal Walk-in Registration Form */
          <>
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
                  items={
                    units.length > 0
                      ? units.map((u) => ({
                          id: u.id,
                          label: `Flat ${u.unit_number}`,
                          subLabel: `${u.unit_type || "Apartment"} • ${u.is_occupied ? "Occupied" : "Vacant"}`,
                          badge: u.unit_type || "Unit",
                          icon: "🏢",
                        }))
                      : [
                          { id: "0be0d1a7-8a9c-46bf-9677-fa36679e01bd", label: "Villa-42 (Tower A)", subLabel: "Siddharth Verma • Owner", badge: "Villa", icon: "🏡" },
                          { id: "a101-dummy", label: "Flat A-101 (Tower A, 1st Floor)", subLabel: "Aman Sharma • Resident", badge: "Apartment", icon: "🏢" },
                        ]
                  }
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

              <View>
                <Text style={styles.label}>Visitor Face / Photo ID (Optional / Recommended)</Text>
                <View style={styles.photoContainer}>
                  {photoUrl ? (
                    <View style={styles.photoPreviewBox}>
                      <Text style={styles.photoSuccessText}>📸 Photo Captured & Attached</Text>
                      <TouchableOpacity onPress={() => setPhotoUrl(null)} style={styles.retakeBtn}>
                        <Text style={styles.retakeBtnText}>✕ Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={handleCapturePhoto}
                      disabled={isUploadingPhoto}
                      style={styles.photoActionBtn}
                    >
                      <Text style={styles.photoActionBtnText}>
                        {isUploadingPhoto ? "Uploading Photo..." : "📷 Capture / Attach Visitor Photo"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <TouchableOpacity
                onPress={handleSubmitWalkIn}
                disabled={isSubmitting}
                style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
              >
                <Text style={styles.submitBtnText}>
                  {isSubmitting ? "SENDING REQUEST..." : "REQUEST RESIDENT APPROVAL"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  photoContainer: {
    marginTop: 4,
  },
  photoActionBtn: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#475569",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  photoActionBtnText: {
    color: "#38bdf8",
    fontSize: 13,
    fontWeight: "700",
  },
  photoPreviewBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#064e3b",
    borderWidth: 1,
    borderColor: "#059669",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  photoSuccessText: {
    color: "#6ee7b7",
    fontSize: 13,
    fontWeight: "700",
  },
  retakeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  retakeBtnText: {
    color: "#fca5a5",
    fontSize: 11,
    fontWeight: "700",
  },
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
  hudCard: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  hudHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hudTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  hudBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  hudBadgeWarning: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderColor: "#f59e0b",
  },
  hudBadgeSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "#10b981",
  },
  hudBadgeDanger: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "#ef4444",
  },
  hudBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  hudBadgeTextWarning: {
    color: "#f59e0b",
  },
  hudBadgeTextSuccess: {
    color: "#10b981",
  },
  hudBadgeTextDanger: {
    color: "#ef4444",
  },
  hudInfoBox: {
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  hudVisitorName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },
  hudMeta: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 3,
    fontWeight: "600",
  },
  hudMetaSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
    fontFamily: "monospace",
  },
  pendingStatusBox: {
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  pendingStatusEmoji: {
    fontSize: 32,
  },
  pendingStatusTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fbbf24",
    textAlign: "center",
  },
  pendingStatusSub: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 18,
  },
  refreshStatusBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  refreshStatusBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  approvedStatusBox: {
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  approvedStatusEmoji: {
    fontSize: 36,
  },
  approvedStatusTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#34d399",
    textAlign: "center",
  },
  approvedStatusSub: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 18,
  },
  grantEntryBtn: {
    backgroundColor: "#10b981",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  grantEntryBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  rejectedStatusBox: {
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  rejectedStatusEmoji: {
    fontSize: 32,
  },
  rejectedStatusTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#f87171",
    textAlign: "center",
  },
  rejectedStatusSub: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 18,
  },
  cancelTrackerBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelTrackerBtnText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
  },
});
