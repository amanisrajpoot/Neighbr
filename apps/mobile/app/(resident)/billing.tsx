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
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../src/theme/colors";
import { useAuthStore } from "../../src/store/authStore";
import { useBilling, InvoiceItem } from "../../src/hooks/useBilling";
import { useVehicles } from "../../src/hooks/useVehicles";
import { useStaff } from "../../src/hooks/useStaff";
import { useFamilyMembers } from "../../src/hooks/useFamilyMembers";
import { QueryErrorView } from "../../src/components/QueryErrorView";

export default function ResidentMyFlatScreen() {
  const { user } = useAuthStore();
  const { invoices, isLoading: isLoadingBilling, isError: isErrorBilling, error: errorBilling, refetch: refetchBilling, payInvoice } = useBilling();
  const { vehicles, isLoading: isLoadingVehicles, isError: isErrorVehicles, error: errorVehicles, refetch: refetchVehicles, registerVehicle } = useVehicles();
  const { unitStaff, isLoadingUnitStaff, isErrorUnitStaff, errorUnitStaff, refetchUnitStaff } = useStaff();
  const { familyMembers, isLoading: isLoadingFamily, isError: isErrorFamily, error: errorFamily, refetch: refetchFamily, addFamilyMember } = useFamilyMembers();

  const [activeTab, setActiveTab] = useState<"overview" | "family" | "vehicles" | "billing">("overview");
  const [refreshing, setRefreshing] = useState(false);

  // Billing states
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "CARD" | "NETBANKING">("UPI");
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Family Members states
  const [isAddFamilyOpen, setIsAddFamilyOpen] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [newFamilyRelation, setNewFamilyRelation] = useState("Spouse");
  const [newFamilyPhone, setNewFamilyPhone] = useState("");
  const [isSubmittingFamily, setIsSubmittingFamily] = useState(false);

  // Vehicle states
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [newVehNumber, setNewVehNumber] = useState("");
  const [newVehType, setNewVehType] = useState<"car" | "bike" | "ev">("car");
  const [newVehModel, setNewVehModel] = useState("");
  const [newVehSlot, setNewVehSlot] = useState("");
  const [isSubmittingVeh, setIsSubmittingVeh] = useState(false);

  const displayInvoices = invoices || [];
  const currentUnpaid = displayInvoices.find((i) => i.status === "UNPAID" || i.status === "OVERDUE");

  const displayFamily = familyMembers.map((fm) => ({
    id: fm.id,
    name: fm.name,
    relation: fm.relation || "Family",
    phone: fm.phone || "Family Member",
    badge: "Resident",
    access: "Gate & Amenities",
  }));

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchBilling(), refetchVehicles(), refetchUnitStaff(), refetchFamily()]);
    setRefreshing(false);
  };

  const handlePay = async () => {
    if (!selectedInvoice) return;
    try {
      setIsSubmittingPay(true);
      const res = await payInvoice({
        invoiceId: selectedInvoice.id,
        paymentMethod,
        amount: selectedInvoice.total_amount,
      });
      Alert.alert("Payment Successful! 🎉", `Receipt ${res.receipt_number} generated for ${selectedInvoice.billing_period}.`);
      setIsPayModalOpen(false);
      setSelectedInvoice(null);
    } catch (e: any) {
      Alert.alert("Payment Failed", e?.message || "Could not process payment transaction. Please try again.");
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const handleAddFamilyMember = async () => {
    if (!newFamilyName.trim()) {
      Alert.alert("Required", "Please enter family member's name.");
      return;
    }
    try {
      setIsSubmittingFamily(true);
      await addFamilyMember({
        name: newFamilyName.trim(),
        relation: newFamilyRelation,
        phone: newFamilyPhone.trim() || undefined,
        age_group: newFamilyRelation === "Son" || newFamilyRelation === "Daughter" ? "child" : "adult",
      });
      Alert.alert("Member Added! 👨‍👩‍👦", `${newFamilyName} is now registered under Flat ${user?.unitNumber || "Villa-42"}.`);
      setIsAddFamilyOpen(false);
      setNewFamilyName("");
      setNewFamilyPhone("");
    } catch (e: any) {
      Alert.alert("Error Adding Family Member", e?.message || "Could not save family member to database.");
    } finally {
      setIsSubmittingFamily(false);
    }
  };


  const handleRegisterVehicle = async () => {
    if (!newVehNumber.trim()) {
      Alert.alert("Required", "Please enter vehicle registration plate number.");
      return;
    }
    try {
      setIsSubmittingVeh(true);
      await registerVehicle({
        vehicle_number: newVehNumber.trim().toUpperCase(),
        vehicle_type: newVehType,
        make_model: newVehModel.trim() || undefined,
        parking_slot: newVehSlot.trim() || undefined,
      });
      Alert.alert("Vehicle Registered! 🚗", `FastTag / Sticker ID assigned for ${newVehNumber.toUpperCase()}.`);
      setIsAddVehicleOpen(false);
      setNewVehNumber("");
      setNewVehModel("");
      setNewVehSlot("");
    } catch (e: any) {
      Alert.alert("Registration Failed", e?.message || "Could not register vehicle. Please verify and retry.");
    } finally {
      setIsSubmittingVeh(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Flat Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.unitTitle}>Flat {user?.unitNumber || "Villa-42"}</Text>
            <Text style={styles.societySub}>{user?.societyName || "Greenwood Palms Heights"}</Text>
          </View>
          <View style={styles.ownerBadge}>
            <Text style={styles.ownerBadgeText}>OWNER OCCUPIED</Text>
          </View>
        </View>

        {/* Quick Specs Pill */}
        <View style={styles.specsRow}>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>Building / Block</Text>
            <Text style={styles.specValue}>Villa Block</Text>
          </View>
          <View style={styles.specDivider} />
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>Super Builtup</Text>
            <Text style={styles.specValue}>3,250 sq.ft.</Text>
          </View>
          <View style={styles.specDivider} />
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>Parking</Text>
            <Text style={styles.specValue}>P-12, EV-04</Text>
          </View>
        </View>
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabsBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "overview" && styles.tabBtnActive]}
          onPress={() => setActiveTab("overview")}
        >
          <Text style={[styles.tabText, activeTab === "overview" && styles.tabTextActive]}>Overview</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "family" && styles.tabBtnActive]}
          onPress={() => setActiveTab("family")}
        >
          <Text style={[styles.tabText, activeTab === "family" && styles.tabTextActive]}>Family ({displayFamily.length})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "vehicles" && styles.tabBtnActive]}
          onPress={() => setActiveTab("vehicles")}
        >
          <Text style={[styles.tabText, activeTab === "vehicles" && styles.tabTextActive]}>Vehicles ({vehicles.length})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "billing" && styles.tabBtnActive]}
          onPress={() => setActiveTab("billing")}
        >
          <Text style={[styles.tabText, activeTab === "billing" && styles.tabTextActive]}>
            Dues {currentUnpaid ? "⚠️" : `(${displayInvoices.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <>
            {/* Primary Resident & Co-Owners */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Primary Owner Profile</Text>
              <View style={styles.ownerCard}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>👤</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ownerName}>{user?.name || "Siddharth Verma"}</Text>
                  <Text style={styles.ownerPhone}>{user?.phone || "+91 98765 30002"}</Text>
                  <Text style={styles.ownerMeta}>Primary Account Holder • Resident since Apr 2024</Text>
                </View>
              </View>
            </View>

            {/* Flat Property Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Property & Allocation Details</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Unit Identification</Text>
                  <Text style={styles.infoVal}>Villa-42 (Ground + 1st Floor)</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Carpet Area</Text>
                  <Text style={styles.infoVal}>2,850 sq.ft. (3,250 Super Builtup)</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Allocated Parking Slots</Text>
                  <Text style={styles.infoVal}>Basement-1: Slot P-12 & EV-04</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Electricity Consumer ID</Text>
                  <Text style={styles.infoVal}>BESCOM-KA-9921448</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Intercom Ext.</Text>
                  <Text style={styles.infoVal}>Ext: 1042 (Gate 1 & Clubhouse direct)</Text>
                </View>
              </View>
            </View>

            {/* Linked Domestic Help Summary */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Assigned Domestic Help ({unitStaff.length})</Text>
                <TouchableOpacity onPress={() => setActiveTab("family")}>
                  <Text style={styles.linkText}>View Details →</Text>
                </TouchableOpacity>
              </View>

              {isErrorUnitStaff ? (
                <QueryErrorView
                  compact
                  error={errorUnitStaff}
                  message="Failed to load domestic staff."
                  onRetry={refetchUnitStaff}
                />
              ) : unitStaff.length > 0 ? (
                unitStaff.map((s, idx) => (
                  <View key={s.id || idx} style={styles.compactStaffCard}>
                    <Text style={styles.compactIcon}>👩‍🍳</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.compactName}>{s.staff?.name || "Domestic Staff"}</Text>
                      <Text style={styles.compactSub}>
                        {s.role || s.staff?.role || "Cook"} • {typeof s.schedule === "string" ? s.schedule : (s.schedule?.note || s.schedule?.text || "Daily")}
                      </Text>
                    </View>
                    <View style={styles.compactBadge}>
                      <Text style={styles.compactBadgeText}>{s.staff?.status || "ASSIGNED"}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyNote}>No domestic staff currently linked to this flat.</Text>
              )}
            </View>
          </>
        )}

        {/* TAB 2: FAMILY & RESIDENTS */}
        {activeTab === "family" && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Registered Family Members</Text>
              <TouchableOpacity onPress={() => setIsAddFamilyOpen(true)} style={styles.addBtn}>
                <Text style={styles.addBtnText}>+ Add Member</Text>
              </TouchableOpacity>
            </View>

            {displayFamily.length > 0 ? (
              displayFamily.map((m) => (
                <View key={m.id} style={styles.memberCard}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>👨‍👩‍👧</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>{m.name}</Text>
                      <View style={styles.relationBadge}>
                        <Text style={styles.relationBadgeText}>{m.relation}</Text>
                      </View>
                    </View>
                    <Text style={styles.memberPhone}>{m.phone}</Text>
                    <Text style={styles.memberAccess}>🔑 {m.access}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardIcon}>👨‍👩‍👧</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.emptyCardTitle}>No Family Members Listed</Text>
                  <Text style={styles.emptyCardSub}>Add spouse, children or parents residing in flat {user?.unitNumber || "Villa-42"}.</Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* TAB 3: VEHICLES */}
        {activeTab === "vehicles" && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Registered Vehicles</Text>
              <TouchableOpacity onPress={() => setIsAddVehicleOpen(true)} style={styles.addBtn}>
                <Text style={styles.addBtnText}>+ Add Vehicle</Text>
              </TouchableOpacity>
            </View>

            {isErrorVehicles ? (
              <QueryErrorView
                error={errorVehicles}
                message="Failed to load registered vehicles."
                onRetry={refetchVehicles}
              />
            ) : vehicles.length > 0 ? (
              vehicles.map((v) => (
                <View key={v.id} style={styles.vehicleCard}>
                  <View style={styles.vehicleIconCircle}>
                    <Text style={styles.vehicleIconText}>{v.vehicle_type === "ev" ? "⚡" : v.vehicle_type === "bike" ? "🏍️" : "🚗"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vehicleNumber}>{v.vehicle_number}</Text>
                    <Text style={styles.vehicleModel}>{v.make_model || "Private Vehicle"} • {v.vehicle_type.toUpperCase()}</Text>
                    <View style={styles.vehicleTagsRow}>
                      <Text style={styles.slotTag}>🅿️ Slot: {v.parking_slot || "Allocated"}</Text>
                      <Text style={styles.rfidTag}>🏷️ Tag: {v.rfid_tag || "RFID Verified"}</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardIcon}>🚗</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.emptyCardTitle}>No Vehicles Registered</Text>
                  <Text style={styles.emptyCardSub}>Add your car or two-wheeler for automatic barrier entry at society gates.</Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* TAB 4: MAINTENANCE DUES & BILLING */}
        {activeTab === "billing" && (
          isErrorBilling ? (
            <QueryErrorView
              error={errorBilling}
              message="Failed to load maintenance billing details."
              onRetry={refetchBilling}
            />
          ) : (
            <>
              {/* Outstanding Dues Banner */}
              {currentUnpaid ? (
                <View style={styles.duesCard}>
                  <View style={styles.duesTop}>
                    <View>
                      <Text style={styles.duesLabel}>Current Outstanding Dues</Text>
                      <Text style={styles.duesPeriod}>{currentUnpaid.billing_period}</Text>
                    </View>
                    <View style={styles.dueBadge}>
                      <Text style={styles.dueBadgeText}>Due by {currentUnpaid.due_date}</Text>
                    </View>
                  </View>

                  <Text style={styles.duesAmount}>₹{currentUnpaid.total_amount.toLocaleString()}</Text>

                  <View style={styles.breakdownBox}>
                    {currentUnpaid.line_items.map((item, idx) => (
                      <View key={idx} style={styles.breakdownRow}>
                        <Text style={styles.breakdownTitle}>{item.title}</Text>
                        <Text style={styles.breakdownValue}>₹{item.amount.toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.payNowBtn}
                    activeOpacity={0.85}
                    onPress={() => {
                      setSelectedInvoice(currentUnpaid);
                      setIsPayModalOpen(true);
                    }}
                  >
                    <Text style={styles.payNowBtnText}>Pay ₹{currentUnpaid.total_amount.toLocaleString()} Online &rarr;</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.allClearCard}>
                  <Text style={styles.allClearEmoji}>✅</Text>
                  <Text style={styles.allClearTitle}>All Flat Maintenance Dues Cleared</Text>
                  <Text style={styles.allClearSub}>No pending charges for Flat {user?.unitNumber || "Villa-42"}.</Text>
                </View>
              )}

              {/* Invoices History */}
              <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Invoices & Billing History</Text>
              {displayInvoices.length === 0 ? (
                <View style={styles.infoCard}>
                  <Text style={styles.emptyNote}>No invoices generated yet for this unit.</Text>
                </View>
              ) : (
                displayInvoices.map((inv) => (
                  <View key={inv.id} style={styles.historyCard}>
                    <View style={styles.historyTop}>
                      <View>
                        <Text style={styles.historyNumber}>{inv.invoice_number}</Text>
                        <Text style={styles.historyPeriod}>{inv.billing_period}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          inv.status === "PAID" ? styles.statusPaid : styles.statusUnpaid,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            inv.status === "PAID" ? styles.statusTextPaid : styles.statusTextUnpaid,
                          ]}
                        >
                          ● {inv.status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.historyFooter}>
                      <Text style={styles.historyAmount}>₹{inv.total_amount.toLocaleString()}</Text>
                      {inv.status === "PAID" ? (
                        <Text style={styles.paidDateText}>Paid on {inv.paid_at ? inv.paid_at.slice(0, 10) : "Receipt Confirmed"}</Text>
                      ) : (
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedInvoice(inv);
                            setIsPayModalOpen(true);
                          }}
                          style={styles.payMiniBtn}
                        >
                          <Text style={styles.payMiniBtnText}>Pay Now</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
              )}
            </>
          )
        )}
      </ScrollView>

      {/* Pay Invoice Modal */}
      {selectedInvoice && (
        <Modal visible={isPayModalOpen} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Maintenance Payment</Text>
                  <Text style={styles.modalSub}>{selectedInvoice.billing_period} • {selectedInvoice.invoice_number}</Text>
                </View>
                <TouchableOpacity onPress={() => setIsPayModalOpen(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.payAmountBox}>
                <Text style={styles.payAmountLabel}>Total Amount Payable</Text>
                <Text style={styles.payAmountValue}>₹{selectedInvoice.total_amount.toLocaleString()}</Text>
              </View>

              <Text style={styles.inputLabel}>Choose Payment Mode</Text>
              <View style={styles.methodsRow}>
                {(["UPI", "CARD", "NETBANKING"] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setPaymentMethod(m)}
                    style={[styles.methodBtn, paymentMethod === m && styles.methodBtnActive]}
                  >
                    <Text style={[styles.methodBtnText, paymentMethod === m && styles.methodBtnTextActive]}>
                      {m === "UPI" ? "⚡ UPI / QR" : m === "CARD" ? "💳 Debit / Credit" : "🏦 NetBanking"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.confirmPayBtn}
                disabled={isSubmittingPay}
                onPress={handlePay}
              >
                {isSubmittingPay ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.confirmPayBtnText}>Authorize Payment (₹{selectedInvoice.total_amount.toLocaleString()})</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Add Family Member Modal */}
      <Modal visible={isAddFamilyOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Family Member</Text>
              <TouchableOpacity onPress={() => setIsAddFamilyOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              placeholder="e.g. Rahul Verma"
              value={newFamilyName}
              onChangeText={setNewFamilyName}
              style={styles.input}
              placeholderTextColor="#94a3b8"
            />

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Relationship</Text>
            <View style={styles.methodsRow}>
              {["Spouse", "Son", "Daughter", "Parent", "Other"].map((rel) => (
                <TouchableOpacity
                  key={rel}
                  onPress={() => setNewFamilyRelation(rel)}
                  style={[styles.methodBtn, newFamilyRelation === rel && styles.methodBtnActive]}
                >
                  <Text style={[styles.methodBtnText, newFamilyRelation === rel && styles.methodBtnTextActive]}>{rel}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Mobile Phone Number (Optional)</Text>
            <TextInput
              placeholder="+91 98765 00000"
              value={newFamilyPhone}
              onChangeText={setNewFamilyPhone}
              keyboardType="phone-pad"
              style={styles.input}
              placeholderTextColor="#94a3b8"
            />

            <TouchableOpacity style={styles.confirmPayBtn} onPress={handleAddFamilyMember}>
              <Text style={styles.confirmPayBtnText}>Save & Register Family Member</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Vehicle Modal */}
      <Modal visible={isAddVehicleOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register New Vehicle</Text>
              <TouchableOpacity onPress={() => setIsAddVehicleOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>License Plate Number *</Text>
            <TextInput
              placeholder="e.g. KA01MJ5522"
              value={newVehNumber}
              onChangeText={setNewVehNumber}
              autoCapitalize="characters"
              style={styles.input}
              placeholderTextColor="#94a3b8"
            />

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Vehicle Type</Text>
            <View style={styles.methodsRow}>
              {(["car", "bike", "ev"] as const).map((vt) => (
                <TouchableOpacity
                  key={vt}
                  onPress={() => setNewVehType(vt)}
                  style={[styles.methodBtn, newVehType === vt && styles.methodBtnActive]}
                >
                  <Text style={[styles.methodBtnText, newVehType === vt && styles.methodBtnTextActive]}>
                    {vt === "car" ? "🚗 4-Wheeler Car" : vt === "bike" ? "🏍️ 2-Wheeler Bike" : "⚡ Electric (EV)"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Make & Model (e.g. Honda City ZX)</Text>
            <TextInput
              placeholder="e.g. Honda City / Ather 450X"
              value={newVehModel}
              onChangeText={setNewVehModel}
              style={styles.input}
              placeholderTextColor="#94a3b8"
            />

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Allocated Parking Slot (e.g. P-12)</Text>
            <TextInput
              placeholder="e.g. P-12 (Basement 1)"
              value={newVehSlot}
              onChangeText={setNewVehSlot}
              style={styles.input}
              placeholderTextColor="#94a3b8"
            />

            <TouchableOpacity style={styles.confirmPayBtn} disabled={isSubmittingVeh} onPress={handleRegisterVehicle}>
              {isSubmittingVeh ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.confirmPayBtnText}>Register Vehicle & FastTag</Text>
              )}
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
  headerCard: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  unitTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: Colors.text,
  },
  societySub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: "600",
  },
  ownerBadge: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  ownerBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: 0.5,
  },
  specsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  specItem: {
    flex: 1,
    alignItems: "center",
  },
  specDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#cbd5e1",
  },
  specLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
  },
  specValue: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 2,
  },
  tabsBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  content: {
    padding: 16,
    gap: 16,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  linkText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  ownerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 24,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  ownerPhone: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 1,
  },
  ownerMeta: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 3,
  },
  infoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  infoKey: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  infoVal: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.text,
  },
  compactStaffCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  compactIcon: {
    fontSize: 20,
  },
  compactName: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.text,
  },
  compactSub: {
    fontSize: 11,
    color: "#64748b",
  },
  compactBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  compactBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
  },
  emptyNote: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: "italic",
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
    marginBottom: 10,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fdf2f8",
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: {
    fontSize: 20,
  },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },
  relationBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  relationBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  memberPhone: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  memberAccess: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "600",
    marginTop: 2,
  },
  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
    marginBottom: 10,
  },
  vehicleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleIconText: {
    fontSize: 20,
  },
  vehicleNumber: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 0.5,
  },
  vehicleModel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 1,
  },
  vehicleTagsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  slotTag: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563eb",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rfidTag: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  duesCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "#fed7aa",
    gap: 12,
    shadowColor: "#f97316",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  duesTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  duesLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ea580c",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  duesPeriod: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 2,
  },
  dueBadge: {
    backgroundColor: "#fff7ed",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffedd5",
  },
  dueBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#c2410c",
  },
  duesAmount: {
    fontSize: 28,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  breakdownBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownTitle: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.text,
  },
  payNowBtn: {
    backgroundColor: "#ea580c",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  payNowBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  allClearCard: {
    backgroundColor: "#ecfdf5",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    gap: 6,
  },
  allClearEmoji: {
    fontSize: 28,
  },
  allClearTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#065f46",
  },
  allClearSub: {
    fontSize: 12,
    color: "#047857",
  },
  historyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
    marginBottom: 8,
  },
  historyTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyNumber: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.text,
  },
  historyPeriod: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPaid: {
    backgroundColor: "#ecfdf5",
  },
  statusUnpaid: {
    backgroundColor: "#fff7ed",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  statusTextPaid: {
    color: "#059669",
  },
  statusTextUnpaid: {
    color: "#ea580c",
  },
  historyFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f8fafc",
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.text,
  },
  paidDateText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },
  payMiniBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  payMiniBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  emptyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  emptyCardIcon: {
    fontSize: 24,
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.text,
  },
  emptyCardSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
  },
  modalSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  modalClose: {
    fontSize: 18,
    color: "#94a3b8",
    padding: 4,
  },
  payAmountBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  payAmountLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
  },
  payAmountValue: {
    fontSize: 28,
    fontWeight: "900",
    color: Colors.primaryDark,
    marginTop: 4,
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
    fontSize: 14,
    color: Colors.text,
  },
  methodsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  methodBtn: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  methodBtnActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#3b82f6",
  },
  methodBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  methodBtnTextActive: {
    color: "#1d4ed8",
  },
  confirmPayBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  confirmPayBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
});
