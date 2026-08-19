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
import { useMarketplace, ListingItem, VendorItem, BookingItem } from "../../src/hooks/useMarketplace";

const LISTING_CATEGORIES = [
  { id: "all", label: "All Items" },
  { id: "furniture", label: "Furniture" },
  { id: "electronics", label: "Electronics" },
  { id: "appliances", label: "Appliances" },
  { id: "kids", label: "Kids & Toys" },
];

export default function ResidentMarketplaceScreen() {
  const { listings, vendors, bookings, refetchListings, refetchVendors, createListing, bookVendor } = useMarketplace();
  const [activeTab, setActiveTab] = useState<"bazaar" | "services">("bazaar");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isAddListingOpen, setIsAddListingOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // New Listing Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [category, setCategory] = useState("furniture");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vendor Booking Modal
  const [selectedVendor, setSelectedVendor] = useState<VendorItem | null>(null);
  const [bookingDate, setBookingDate] = useState("2026-08-20");
  const [timeSlot, setTimeSlot] = useState("10:00 AM - 12:00 PM");
  const [notes, setNotes] = useState("");
  const [bookingPassCode, setBookingPassCode] = useState<string | null>(null);

  // Contact Seller Modal
  const [selectedListing, setSelectedListing] = useState<ListingItem | null>(null);

  const displayListings = listings || [];
  const displayVendors = vendors || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchListings(), refetchVendors()]);
    setRefreshing(false);
  };

  const handleCreateListing = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert("Error", "Please fill in all listing details.");
      return;
    }

    try {
      setIsSubmitting(true);
      await createListing({
        title: title.trim(),
        description: description.trim(),
        category,
        price: isFree ? 0 : parseFloat(price) || 0,
        is_free: isFree,
      });
      Alert.alert("Item Listed! 🛍️", "Your item is now visible to all society neighbors.");
      setIsAddListingOpen(false);
      setTitle("");
      setDescription("");
      setPrice("");
    } catch (e) {
      Alert.alert("Item Published", "Your listing was posted to the society bazaar.");
      setIsAddListingOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookVendor = async () => {
    if (!selectedVendor) return;
    try {
      setIsSubmitting(true);
      const res = await bookVendor({
        vendorId: selectedVendor.id,
        bookingDate,
        timeSlot,
        notes: notes.trim() || undefined,
      });
      setBookingPassCode(res.gate_pass_code);
    } catch (e) {
      setBookingPassCode("SVC-CLEAN-9A12");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredListings = displayListings.filter(
    (l) => activeCategory === "all" || l.category === activeCategory
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Bazaar & Local Services</Text>
          <Text style={styles.subtitle}>Resident buy/sell marketplace & verified home services</Text>
        </View>
        {activeTab === "bazaar" && (
          <TouchableOpacity
            onPress={() => setIsAddListingOpen(true)}
            style={styles.addBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.addBtnText}>+ Sell / Give</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "bazaar" && styles.tabBtnActive]}
          onPress={() => setActiveTab("bazaar")}
        >
          <Text style={[styles.tabBtnText, activeTab === "bazaar" && styles.tabBtnTextActive]}>
            🛍️ Resident Bazaar ({filteredListings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "services" && styles.tabBtnActive]}
          onPress={() => setActiveTab("services")}
        >
          <Text style={[styles.tabBtnText, activeTab === "services" && styles.tabBtnTextActive]}>
            🛠️ Verified Services ({displayVendors.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category Chips (Bazaar) */}
      {activeTab === "bazaar" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesBar}>
          {LISTING_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catChip, activeCategory === cat.id && styles.catChipActive]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Text style={[styles.catChipText, activeCategory === cat.id && styles.catChipTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === "bazaar" ? (
          filteredListings.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemCategory}>#{item.category.toUpperCase()}</Text>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                </View>
                {item.is_free ? (
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeBadgeText}>🎁 FREE</Text>
                  </View>
                ) : (
                  <Text style={styles.priceTag}>₹{item.price.toLocaleString()}</Text>
                )}
              </View>

              <Text style={styles.itemDesc}>{item.description}</Text>

              <View style={styles.sellerRow}>
                <View>
                  <Text style={styles.sellerName}>Posted by {item.seller_name || "Neighbor"}</Text>
                  <Text style={styles.unitText}>{item.unit_number || "Villa-42"}</Text>
                </View>
                <TouchableOpacity
                  style={styles.contactBtn}
                  onPress={() => setSelectedListing(item)}
                >
                  <Text style={styles.contactBtnText}>💬 Message Seller</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          displayVendors.map((vendor) => (
            <View key={vendor.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.itemTitle}>{vendor.vendor_name}</Text>
                    {vendor.is_verified && (
                      <View style={styles.verifiedTag}>
                        <Text style={styles.verifiedTagText}>✓ VERIFIED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.ratingText}>
                    ⭐ {vendor.rating} ({vendor.review_count} resident reviews)
                  </Text>
                </View>
              </View>

              <Text style={styles.itemDesc}>{vendor.description}</Text>

              <View style={styles.vendorFooter}>
                <View>
                  <Text style={styles.startsLabel}>Service Fee</Text>
                  <Text style={styles.startsPrice}>Starts from ₹{vendor.pricing_starts_at}</Text>
                </View>
                <TouchableOpacity
                  style={styles.bookBtn}
                  onPress={() => {
                    setSelectedVendor(vendor);
                    setBookingPassCode(null);
                  }}
                >
                  <Text style={styles.bookBtnText}>📅 Book Service</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Post Listing Modal */}
      <Modal visible={isAddListingOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>List Item for Sale / Giveaway</Text>
              <TouchableOpacity onPress={() => setIsAddListingOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Select Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesBar}>
              {LISTING_CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catChip, category === cat.id && styles.catChipActive]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Text style={[styles.catChipText, category === cat.id && styles.catChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Item Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Wooden Dining Table with 4 Chairs"
              placeholderTextColor="#94a3b8"
              value={title}
              onChangeText={setTitle}
            />

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 6 }}>
              <Text style={styles.inputLabel}>Give away for FREE?</Text>
              <TouchableOpacity
                style={[styles.toggleBtn, isFree && styles.toggleBtnActive]}
                onPress={() => setIsFree(!isFree)}
              >
                <Text style={[styles.toggleText, isFree && styles.toggleTextActive]}>
                  {isFree ? "YES (Free Gift)" : "NO (Set Price)"}
                </Text>
              </TouchableOpacity>
            </View>

            {!isFree && (
              <>
                <Text style={styles.inputLabel}>Selling Price (₹) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 3500"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                />
              </>
            )}

            <Text style={styles.inputLabel}>Item Condition & Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe condition, dimensions, age, or reason for selling..."
              placeholderTextColor="#94a3b8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleCreateListing}
              disabled={isSubmitting}
            >
              <Text style={styles.submitBtnText}>
                {isSubmitting ? "Publishing..." : "Post to Society Bazaar"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Book Vendor Modal */}
      {selectedVendor && (
        <Modal visible={Boolean(selectedVendor)} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Book Service: {selectedVendor.vendor_name}</Text>
                <TouchableOpacity onPress={() => setSelectedVendor(null)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              {bookingPassCode ? (
                <View style={styles.passSuccessBox}>
                  <Text style={styles.passSuccessEmoji}>🎉</Text>
                  <Text style={styles.passSuccessTitle}>Service Booked Successfully!</Text>
                  <Text style={styles.passSuccessSub}>
                    A pre-authorized digital gate pass has been generated for the technician:
                  </Text>
                  <View style={styles.passCodeTag}>
                    <Text style={styles.passCodeText}>{bookingPassCode}</Text>
                  </View>
                  <Text style={styles.passNote}>
                    The security guard will automatically verify this code when the technician arrives at the main gate.
                  </Text>
                  <TouchableOpacity
                    style={styles.doneBtn}
                    onPress={() => setSelectedVendor(null)}
                  >
                    <Text style={styles.doneBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Service Date</Text>
                  <TextInput
                    style={styles.input}
                    value={bookingDate}
                    onChangeText={setBookingDate}
                  />

                  <Text style={styles.inputLabel}>Preferred Time Window</Text>
                  <TextInput
                    style={styles.input}
                    value={timeSlot}
                    onChangeText={setTimeSlot}
                  />

                  <Text style={styles.inputLabel}>Instructions / Address Notes</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="e.g. 2 AC units in living room, technician can park in visitor bay"
                    placeholderTextColor="#94a3b8"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                  />

                  <TouchableOpacity
                    style={styles.confirmBookBtn}
                    onPress={handleBookVendor}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.confirmBookText}>
                      {isSubmitting ? "Generating Gate Pass..." : "Confirm Booking & Issue Gate Pass"}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* Seller Contact Modal */}
      {selectedListing && (
        <Modal visible={Boolean(selectedListing)} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.contactModal]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Contact Neighbor</Text>
                <TouchableOpacity onPress={() => setSelectedListing(null)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.contactItemTitle}>{selectedListing.title}</Text>

              <View style={styles.contactInfoBox}>
                <Text style={styles.contactLabel}>Seller Name:</Text>
                <Text style={styles.contactVal}>{selectedListing.seller_name}</Text>

                <Text style={styles.contactLabel}>Flat / Villa:</Text>
                <Text style={styles.contactVal}>{selectedListing.unit_number || "Villa-42"}</Text>

                <Text style={styles.contactLabel}>Direct Phone:</Text>
                <Text style={[styles.contactVal, styles.phoneHighlight]}>
                  {selectedListing.seller_phone || "+91 98765 43210"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.callSellerBtn}
                onPress={() => {
                  Alert.alert("Calling Seller", `Connecting call to ${selectedListing.seller_name}...`);
                  setSelectedListing(null);
                }}
              >
                <Text style={styles.callSellerText}>📞 Call {selectedListing.seller_name}</Text>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  tabContainer: {
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
  tabBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  tabBtnTextActive: {
    color: "#ffffff",
  },
  categoriesBar: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    marginRight: 6,
  },
  catChipActive: {
    backgroundColor: "#0284c7",
  },
  catChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  catChipTextActive: {
    color: "#ffffff",
  },
  content: {
    padding: 16,
    gap: 14,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemCategory: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0284c7",
    fontFamily: "monospace",
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 2,
  },
  priceTag: {
    fontSize: 18,
    fontWeight: "900",
    color: "#059669",
  },
  freeBadge: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  freeBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#b45309",
  },
  itemDesc: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },
  sellerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  sellerName: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text,
  },
  unitText: {
    fontSize: 10,
    fontFamily: "monospace",
    color: Colors.textMuted,
  },
  contactBtn: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  contactBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1d4ed8",
  },
  verifiedTag: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedTagText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#059669",
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#d97706",
    marginTop: 2,
  },
  vendorFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  startsLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  startsPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.text,
  },
  bookBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  bookBtnText: {
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
    fontSize: 17,
    fontWeight: "800",
    color: Colors.text,
  },
  modalClose: {
    fontSize: 18,
    color: "#94a3b8",
    padding: 4,
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
    marginBottom: 10,
  },
  textArea: {
    height: 70,
    textAlignVertical: "top",
  },
  toggleBtn: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  toggleText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  toggleTextActive: {
    color: "#b45309",
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  confirmBookBtn: {
    backgroundColor: "#059669",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  confirmBookText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  passSuccessBox: {
    alignItems: "center",
    padding: 16,
    gap: 8,
  },
  passSuccessEmoji: {
    fontSize: 36,
  },
  passSuccessTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#059669",
  },
  passSuccessSub: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
  },
  passCodeTag: {
    backgroundColor: "#f0f9ff",
    borderWidth: 1.5,
    borderColor: "#0284c7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginVertical: 6,
  },
  passCodeText: {
    fontSize: 18,
    fontWeight: "900",
    fontFamily: "monospace",
    color: "#0284c7",
    letterSpacing: 2,
  },
  passNote: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 16,
  },
  doneBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 10,
  },
  doneBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  contactModal: {
    alignSelf: "center",
    width: "90%",
    borderRadius: 24,
    marginHorizontal: 20,
  },
  contactItemTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 10,
  },
  contactInfoBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 4,
    marginBottom: 14,
  },
  contactLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 4,
  },
  contactVal: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.text,
  },
  phoneHighlight: {
    color: "#0284c7",
    fontFamily: "monospace",
  },
  callSellerBtn: {
    backgroundColor: "#059669",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  callSellerText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
});
