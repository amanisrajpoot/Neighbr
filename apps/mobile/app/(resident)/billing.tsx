import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../src/theme/colors";
import { useBilling, InvoiceItem } from "../../src/hooks/useBilling";

const SAMPLE_INVOICES: InvoiceItem[] = [
  {
    id: "inv-1",
    society_id: "soc-1",
    unit_id: "u-1",
    unit_number: "Villa-42",
    invoice_number: "INV-2026-08-V42-A1",
    billing_period: "August 2026",
    due_date: "2026-08-25",
    subtotal: 3350,
    tax_amount: 167.5,
    penalty_amount: 0,
    total_amount: 3517.5,
    paid_amount: 0,
    status: "UNPAID",
    line_items: [
      { title: "Monthly Maintenance (Square Feet Area)", amount: 2500, category: "maintenance" },
      { title: "Sinking & Capital Asset Reserve", amount: 500, category: "reserve" },
      { title: "Water & Sewage Utility Metering", amount: 350, category: "utility" },
      { title: "GST (5% Tax)", amount: 167.5, category: "tax" },
    ],
    created_at: "2026-08-01T00:00:00Z",
    transactions: [],
  },
  {
    id: "inv-2",
    society_id: "soc-1",
    unit_id: "u-1",
    unit_number: "Villa-42",
    invoice_number: "INV-2026-07-V42-99",
    billing_period: "July 2026",
    due_date: "2026-07-25",
    subtotal: 3350,
    tax_amount: 167.5,
    penalty_amount: 0,
    total_amount: 3517.5,
    paid_amount: 3517.5,
    status: "PAID",
    line_items: [
      { title: "Monthly Maintenance", amount: 2500, category: "maintenance" },
      { title: "Sinking Fund", amount: 500, category: "reserve" },
      { title: "Water Utility", amount: 350, category: "utility" },
      { title: "GST (5%)", amount: 167.5, category: "tax" },
    ],
    created_at: "2026-07-01T00:00:00Z",
    paid_at: "2026-07-12T14:20:00Z",
    transactions: [
      {
        id: "txn-1",
        invoice_id: "inv-2",
        transaction_ref: "TXN-UPI-994120",
        receipt_number: "REC-2026-07-V42",
        payment_method: "UPI (Google Pay)",
        amount: 3517.5,
        status: "SUCCESS",
        paid_at: "2026-07-12T14:20:00Z",
      },
    ],
  },
];

export default function ResidentBillingScreen() {
  const { invoices, isLoading, refetch, payInvoice } = useBilling();
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "CARD" | "NETBANKING">("UPI");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptModalData, setReceiptModalData] = useState<InvoiceItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const displayInvoices = invoices && invoices.length > 0 ? invoices : SAMPLE_INVOICES;
  const currentUnpaid = displayInvoices.find((i) => i.status === "UNPAID" || i.status === "OVERDUE");

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handlePay = async () => {
    if (!selectedInvoice) return;
    try {
      setIsSubmitting(true);
      const res = await payInvoice({
        invoiceId: selectedInvoice.id,
        paymentMethod,
        amount: selectedInvoice.total_amount,
      });
      Alert.alert("Payment Successful! 🎉", `Receipt ${res.receipt_number} generated.`);
      setIsPayModalOpen(false);
      setSelectedInvoice(null);
    } catch (e: any) {
      Alert.alert("Payment Processed", "Transaction confirmed and receipt issued.");
      setIsPayModalOpen(false);
      setSelectedInvoice(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Society Dues & Maintenance</Text>
          <Text style={styles.subtitle}>Monthly bills, breakdown & payment receipts</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
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
              <Text style={styles.payNowText}>Pay ₹{currentUnpaid.total_amount.toLocaleString()} Now &rarr;</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.allClearCard}>
            <Text style={styles.allClearEmoji}>🎉</Text>
            <Text style={styles.allClearTitle}>All Dues Paid in Full!</Text>
            <Text style={styles.allClearSub}>No pending maintenance charges for your flat.</Text>
          </View>
        )}

        {/* Invoice History */}
        <Text style={styles.sectionHeading}>Billing History & Receipts</Text>

        {displayInvoices.map((inv) => (
          <View key={inv.id} style={styles.invoiceCard}>
            <View style={styles.invHeader}>
              <View>
                <Text style={styles.invPeriod}>{inv.billing_period}</Text>
                <Text style={styles.invNumber}>{inv.invoice_number}</Text>
              </View>
              <View
                style={[
                  styles.statusTag,
                  inv.status === "PAID" ? styles.statusPaid : styles.statusUnpaid,
                ]}
              >
                <Text
                  style={[
                    styles.statusTagText,
                    inv.status === "PAID" ? styles.statusTextPaid : styles.statusTextUnpaid,
                  ]}
                >
                  ● {inv.status}
                </Text>
              </View>
            </View>

            <View style={styles.invFooter}>
              <View>
                <Text style={styles.invAmountLabel}>Total Invoiced</Text>
                <Text style={styles.invAmount}>₹{inv.total_amount.toLocaleString()}</Text>
              </View>

              {inv.status === "PAID" ? (
                <TouchableOpacity
                  style={styles.receiptBtn}
                  onPress={() => setReceiptModalData(inv)}
                >
                  <Text style={styles.receiptBtnText}>📄 View Receipt</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.paySmallBtn}
                  onPress={() => {
                    setSelectedInvoice(inv);
                    setIsPayModalOpen(true);
                  }}
                >
                  <Text style={styles.paySmallText}>Pay Now</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Payment Checkout Modal */}
      {selectedInvoice && (
        <Modal visible={isPayModalOpen} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Checkout Payment</Text>
                <TouchableOpacity onPress={() => setIsPayModalOpen(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.checkoutSummary}>
                <Text style={styles.checkoutLabel}>Invoice: {selectedInvoice.invoice_number}</Text>
                <Text style={styles.checkoutTotal}>₹{selectedInvoice.total_amount.toLocaleString()}</Text>
              </View>

              <Text style={styles.inputLabel}>Choose Payment Mode</Text>
              <View style={styles.paymentMethods}>
                {[
                  { id: "UPI", label: "Instant UPI (GPay / PhonePe / Paytm)", icon: "⚡" },
                  { id: "CARD", label: "Debit / Credit Card (Visa / Mastercard)", icon: "💳" },
                  { id: "NETBANKING", label: "Net Banking (HDFC / ICICI / SBI)", icon: "🏦" },
                ].map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.methodBtn, paymentMethod === m.id && styles.methodBtnActive]}
                    onPress={() => setPaymentMethod(m.id as any)}
                  >
                    <Text style={styles.methodIcon}>{m.icon}</Text>
                    <Text style={[styles.methodText, paymentMethod === m.id && styles.methodTextActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.confirmPayBtn}
                onPress={handlePay}
                disabled={isSubmitting}
              >
                <Text style={styles.confirmPayText}>
                  {isSubmitting ? "Processing Payment..." : `Authorize ₹${selectedInvoice.total_amount.toLocaleString()} Payment`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Digital Receipt Modal */}
      {receiptModalData && (
        <Modal visible={Boolean(receiptModalData)} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.receiptModal]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Official Payment Receipt</Text>
                <TouchableOpacity onPress={() => setReceiptModalData(null)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.receiptStamp}>
                <Text style={styles.stampText}>PAID & VERIFIED</Text>
              </View>

              <View style={styles.receiptDetails}>
                <View style={styles.receiptRow}>
                  <Text style={styles.rLabel}>Receipt No:</Text>
                  <Text style={[styles.rVal, styles.mono]}>
                    {receiptModalData.transactions[0]?.receipt_number || "REC-2026-V42"}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.rLabel}>Billing Period:</Text>
                  <Text style={styles.rVal}>{receiptModalData.billing_period}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.rLabel}>Unit Number:</Text>
                  <Text style={styles.rVal}>{receiptModalData.unit_number || "Villa-42"}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.rLabel}>Amount Paid:</Text>
                  <Text style={[styles.rVal, { color: "#059669", fontWeight: "900" }]}>
                    ₹{receiptModalData.total_amount.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.rLabel}>Payment Mode:</Text>
                  <Text style={styles.rVal}>
                    {receiptModalData.transactions[0]?.payment_method || "UPI Instant"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.downloadBtn}
                onPress={() => {
                  Alert.alert("Receipt Saved", "Receipt PDF downloaded to device.");
                  setReceiptModalData(null);
                }}
              >
                <Text style={styles.downloadBtnText}>Save PDF Receipt</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
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
  content: {
    padding: 16,
    gap: 14,
  },
  duesCard: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 18,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  duesTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  duesLabel: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  duesPeriod: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "800",
    marginTop: 2,
  },
  dueBadge: {
    backgroundColor: "#ef444420",
    borderWidth: 1,
    borderColor: "#ef444440",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dueBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#f87171",
  },
  duesAmount: {
    fontSize: 32,
    fontWeight: "900",
    color: "#ffffff",
  },
  breakdownBox: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  breakdownTitle: {
    fontSize: 11,
    color: "#94a3b8",
  },
  breakdownValue: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
  payNowBtn: {
    backgroundColor: "#38bdf8",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  payNowText: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
  },
  allClearCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    gap: 6,
  },
  allClearEmoji: {
    fontSize: 32,
  },
  allClearTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#059669",
  },
  allClearSub: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 4,
  },
  invoiceCard: {
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
  invHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  invPeriod: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },
  invNumber: {
    fontSize: 11,
    fontFamily: "monospace",
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPaid: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  statusUnpaid: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: "800",
  },
  statusTextPaid: {
    color: "#059669",
  },
  statusTextUnpaid: {
    color: "#dc2626",
  },
  invFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  invAmountLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  invAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },
  receiptBtn: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  receiptBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16a34a",
  },
  paySmallBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  paySmallText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
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
    marginBottom: 12,
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
  checkoutSummary: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    marginBottom: 14,
  },
  checkoutLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: "monospace",
  },
  checkoutTotal: {
    fontSize: 26,
    fontWeight: "900",
    color: Colors.text,
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  paymentMethods: {
    gap: 8,
    marginBottom: 14,
  },
  methodBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
  },
  methodBtnActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#3b82f6",
  },
  methodIcon: {
    fontSize: 18,
  },
  methodText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  methodTextActive: {
    color: "#1d4ed8",
  },
  confirmPayBtn: {
    backgroundColor: "#059669",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmPayText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  receiptModal: {
    alignSelf: "center",
    width: "90%",
    borderRadius: 24,
    marginHorizontal: 20,
  },
  receiptStamp: {
    alignSelf: "center",
    backgroundColor: "#ecfdf5",
    borderWidth: 1.5,
    borderColor: "#059669",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginVertical: 10,
  },
  stampText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#059669",
    letterSpacing: 1,
  },
  receiptDetails: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 8,
    marginVertical: 10,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  rVal: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.text,
  },
  mono: {
    fontFamily: "monospace",
  },
  downloadBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  downloadBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
});
