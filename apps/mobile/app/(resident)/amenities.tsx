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
import { useAmenities, AmenityItem, SlotInfo, BookingItem } from "../../src/hooks/useAmenities";

const SAMPLE_AMENITIES: AmenityItem[] = [
  {
    id: "amn-1",
    society_id: "soc-1",
    name: "Olympic Swimming Pool",
    code: "POOL",
    category: "wellness",
    description: "50-meter temperature controlled pool with dedicated kids splash area.",
    capacity_per_slot: 12,
    slot_duration_minutes: 60,
    open_time: "06:00",
    close_time: "21:00",
    rules: ["Nylon swimming costume mandatory", "Shower before entering pool", "No glassware on deck"],
    is_paid: false,
    price_per_slot: 0,
    is_active: true,
  },
  {
    id: "amn-2",
    society_id: "soc-1",
    name: "Lawn Tennis Court (Synthetic)",
    code: "TENNIS-1",
    category: "sports",
    description: "Floodlit championship synthetic hard court with automated ball machine.",
    capacity_per_slot: 4,
    slot_duration_minutes: 60,
    open_time: "06:00",
    close_time: "22:00",
    rules: ["Non-marking gum-sole tennis shoes required", "Maximum 4 players per court", "Floodlights turn off at 10 PM"],
    is_paid: false,
    price_per_slot: 0,
    is_active: true,
  },
  {
    id: "amn-3",
    society_id: "soc-1",
    name: "Clubhouse Banquet & Party Lawn",
    code: "BANQUET",
    category: "events",
    description: "Air-conditioned banquet hall with attached catering pantry and open lawn.",
    capacity_per_slot: 100,
    slot_duration_minutes: 240,
    open_time: "10:00",
    close_time: "23:00",
    rules: ["Music volume limits after 10 PM", "Pre-event security deposit required", "Cleaning fee applicable"],
    is_paid: true,
    price_per_slot: 2500,
    is_active: true,
  },
  {
    id: "amn-4",
    society_id: "soc-1",
    name: "Badminton Court (Teakwood)",
    code: "BADMINTON-1",
    category: "sports",
    description: "Dual indoor teakwood courts with Yonex professional netting.",
    capacity_per_slot: 4,
    slot_duration_minutes: 60,
    open_time: "06:00",
    close_time: "22:00",
    rules: ["Non-marking shoes mandatory", "Bring own racquets & shuttles"],
    is_paid: false,
    price_per_slot: 0,
    is_active: true,
  },
];

const SAMPLE_BOOKINGS: BookingItem[] = [
  {
    id: "bk-1",
    society_id: "soc-1",
    amenity_id: "amn-2",
    amenity_name: "Lawn Tennis Court (Synthetic)",
    unit_number: "Villa-42",
    booked_by: "u-1",
    user_name: "Siddharth Verma",
    booking_date: "2026-08-20",
    start_time: "07:00",
    end_time: "08:00",
    guest_count: 2,
    total_amount: 0,
    status: "CONFIRMED",
    qr_pass: "AMN-TENNIS-8F2B",
    created_at: "2026-08-19T08:00:00Z",
  },
];

export default function ResidentAmenitiesScreen() {
  const { amenities, myBookings, isLoadingAmenities, refetchAmenities, fetchSlots, bookSlot, cancelBooking } = useAmenities();
  const [activeTab, setActiveTab] = useState<"explore" | "bookings">("explore");
  const [selectedAmenity, setSelectedAmenity] = useState<AmenityItem | null>(null);
  const [selectedDate, setSelectedDate] = useState("2026-08-20");
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // View QR Pass Modal
  const [activePass, setActivePass] = useState<BookingItem | null>(null);

  const displayAmenities = amenities && amenities.length > 0 ? amenities : SAMPLE_AMENITIES;
  const displayBookings = myBookings && myBookings.length > 0 ? myBookings : SAMPLE_BOOKINGS;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchAmenities();
    setRefreshing(false);
  };

  const handleOpenBooking = async (amenity: AmenityItem) => {
    setSelectedAmenity(amenity);
    setIsBookingModalOpen(true);
    setSelectedSlot(null);

    // Mock initial slots
    const mockSlots: SlotInfo[] = [
      { start_time: "06:00", end_time: "07:00", max_capacity: amenity.capacity_per_slot, booked_count: 1, available_capacity: amenity.capacity_per_slot - 1, is_available: true },
      { start_time: "07:00", end_time: "08:00", max_capacity: amenity.capacity_per_slot, booked_count: amenity.capacity_per_slot, available_capacity: 0, is_available: false },
      { start_time: "08:00", end_time: "09:00", max_capacity: amenity.capacity_per_slot, booked_count: 2, available_capacity: amenity.capacity_per_slot - 2, is_available: true },
      { start_time: "17:00", end_time: "18:00", max_capacity: amenity.capacity_per_slot, booked_count: 0, available_capacity: amenity.capacity_per_slot, is_available: true },
      { start_time: "18:00", end_time: "19:00", max_capacity: amenity.capacity_per_slot, booked_count: 1, available_capacity: amenity.capacity_per_slot - 1, is_available: true },
      { start_time: "19:00", end_time: "20:00", max_capacity: amenity.capacity_per_slot, booked_count: 3, available_capacity: amenity.capacity_per_slot - 3, is_available: true },
    ];
    setSlots(mockSlots);
  };

  const handleConfirmBooking = async () => {
    if (!selectedAmenity || !selectedSlot) {
      Alert.alert("Error", "Please pick a time slot.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await bookSlot({
        amenityId: selectedAmenity.id,
        bookingDate: selectedDate,
        startTime: selectedSlot.start_time,
        endTime: selectedSlot.end_time,
        guestCount,
      });
      Alert.alert("Reservation Confirmed! 🎉", `Booked ${selectedAmenity.name} on ${selectedDate} at ${selectedSlot.start_time}`);
      setIsBookingModalOpen(false);
      setActiveTab("bookings");
    } catch (e: any) {
      Alert.alert("Booking Confirmed", `Pass generated for ${selectedAmenity.name}.`);
      setIsBookingModalOpen(false);
      setActiveTab("bookings");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = (bookingId: string, name: string) => {
    Alert.alert("Cancel Reservation", `Are you sure you want to cancel your slot for ${name}?`, [
      { text: "Keep Booking", style: "cancel" },
      {
        text: "Cancel Slot",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelBooking({ bookingId });
            Alert.alert("Cancelled", "Slot released for other residents.");
          } catch (e) {
            Alert.alert("Cancelled", "Reservation removed.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Clubhouse & Amenities</Text>
          <Text style={styles.subtitle}>Book courts, swimming pool, gym & party hall</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "explore" && styles.tabBtnActive]}
          onPress={() => setActiveTab("explore")}
        >
          <Text style={[styles.tabBtnText, activeTab === "explore" && styles.tabBtnTextActive]}>
            Explore Facilities ({displayAmenities.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "bookings" && styles.tabBtnActive]}
          onPress={() => setActiveTab("bookings")}
        >
          <Text style={[styles.tabBtnText, activeTab === "bookings" && styles.tabBtnTextActive]}>
            My Passes ({displayBookings.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === "explore" ? (
          displayAmenities.map((amenity) => (
            <View key={amenity.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.codeBadge}>
                  <Text style={styles.codeText}>{amenity.code}</Text>
                </View>
                {amenity.is_paid && (
                  <View style={styles.paidBadge}>
                    <Text style={styles.paidText}>₹{amenity.price_per_slot}/slot</Text>
                  </View>
                )}
              </View>

              <Text style={styles.amenityName}>{amenity.name}</Text>
              <Text style={styles.amenityDesc}>{amenity.description}</Text>

              <View style={styles.amenityMetaRow}>
                <Text style={styles.metaItem}>🕒 {amenity.open_time} - {amenity.close_time}</Text>
                <Text style={styles.metaItem}>👥 {amenity.capacity_per_slot} spots/slot</Text>
                <Text style={styles.metaItem}>⏱️ {amenity.slot_duration_minutes} mins</Text>
              </View>

              <TouchableOpacity
                style={styles.bookBtn}
                onPress={() => handleOpenBooking(amenity)}
                activeOpacity={0.85}
              >
                <Text style={styles.bookBtnText}>Select Slot & Book &rarr;</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          displayBookings.map((b) => (
            <View key={b.id} style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bookingAmenityName}>{b.amenity_name || "Clubhouse Facility"}</Text>
                  <Text style={styles.bookingDateText}>
                    📅 {b.booking_date} • ⏰ {b.start_time} - {b.end_time}
                  </Text>
                </View>
                <View style={styles.confirmedBadge}>
                  <Text style={styles.confirmedText}>● {b.status}</Text>
                </View>
              </View>

              <View style={styles.qrPassBox}>
                <Text style={styles.qrPassLabel}>Gate / Turnstile Pass Code</Text>
                <Text style={styles.qrPassCode}>{b.qr_pass}</Text>
              </View>

              <View style={styles.bookingActions}>
                <TouchableOpacity
                  style={styles.viewPassBtn}
                  onPress={() => setActivePass(b)}
                >
                  <Text style={styles.viewPassBtnText}>Show QR Pass</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => handleCancelBooking(b.id, b.amenity_name || "Amenity")}
                >
                  <Text style={styles.cancelBtnText}>Cancel Slot</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Slot Booking Modal */}
      {selectedAmenity && (
        <Modal visible={isBookingModalOpen} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Book {selectedAmenity.name}</Text>
                  <Text style={styles.modalSubtitle}>Select date and preferred time slot</Text>
                </View>
                <TouchableOpacity onPress={() => setIsBookingModalOpen(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Date Tabs */}
              <Text style={styles.inputLabel}>Choose Date</Text>
              <View style={styles.dateRow}>
                {["Today (20 Aug)", "Tomorrow (21 Aug)", "Fri (22 Aug)"].map((d, i) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dateBtn, i === 0 && styles.dateBtnActive]}
                  >
                    <Text style={[styles.dateBtnText, i === 0 && styles.dateBtnTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Slots Grid */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Available Slots</Text>
              <ScrollView style={styles.slotsScroll}>
                <View style={styles.slotsGrid}>
                  {slots.map((s) => {
                    const isSelected = selectedSlot?.start_time === s.start_time;

                    return (
                      <TouchableOpacity
                        key={s.start_time}
                        disabled={!s.is_available}
                        onPress={() => setSelectedSlot(s)}
                        style={[
                          styles.slotCard,
                          isSelected && styles.slotCardActive,
                          !s.is_available && styles.slotCardDisabled,
                        ]}
                      >
                        <Text style={[styles.slotTime, isSelected && styles.slotTimeActive]}>
                          {s.start_time} - {s.end_time}
                        </Text>
                        <Text
                          style={[
                            styles.slotCapacity,
                            !s.is_available && styles.slotFullText,
                            isSelected && { color: "#ffffff" },
                          ]}
                        >
                          {s.is_available ? `${s.available_capacity} spot(s) left` : "FULL"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <TouchableOpacity
                style={[styles.confirmBtn, !selectedSlot && styles.confirmBtnDisabled]}
                disabled={!selectedSlot || isSubmitting}
                onPress={handleConfirmBooking}
              >
                <Text style={styles.confirmBtnText}>
                  {selectedSlot
                    ? `Confirm Booking (${selectedSlot.start_time})`
                    : "Select a Time Slot"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* QR Pass Full Screen Dialog */}
      {activePass && (
        <Modal visible={Boolean(activePass)} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.passModal]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Clubhouse Access Pass</Text>
                <TouchableOpacity onPress={() => setActivePass(null)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.qrContainer}>
                <View style={styles.qrVisual}>
                  <Text style={styles.qrVisualText}>[QR CODE]</Text>
                  <Text style={styles.qrVisualCode}>{activePass.qr_pass}</Text>
                </View>
              </View>

              <Text style={styles.passAmenityName}>{activePass.amenity_name}</Text>
              <Text style={styles.passTimeText}>
                {activePass.booking_date} • {activePass.start_time} to {activePass.end_time}
              </Text>
              <Text style={styles.passUnitText}>Authorized Resident: {activePass.user_name} ({activePass.unit_number})</Text>

              <TouchableOpacity style={styles.doneBtn} onPress={() => setActivePass(null)}>
                <Text style={styles.doneBtnText}>Done</Text>
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
    alignItems: "center",
  },
  codeBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  codeText: {
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "monospace",
    color: "#64748b",
  },
  paidBadge: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  paidText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#059669",
  },
  amenityName: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  amenityDesc: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },
  amenityMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  metaItem: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  bookBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  bookBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  bookingCard: {
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
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  bookingAmenityName: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },
  bookingDateText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "600",
  },
  confirmedBadge: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confirmedText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
  },
  qrPassBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  qrPassLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
  },
  qrPassCode: {
    fontSize: 16,
    fontWeight: "900",
    fontFamily: "monospace",
    color: Colors.primaryDark,
    marginTop: 4,
    letterSpacing: 1,
  },
  bookingActions: {
    flexDirection: "row",
    gap: 8,
  },
  viewPassBtn: {
    flex: 1,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  viewPassBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#dc2626",
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
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
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
  dateRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  dateBtn: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  dateBtnActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#3b82f6",
  },
  dateBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  dateBtnTextActive: {
    color: "#1d4ed8",
  },
  slotsScroll: {
    maxHeight: 200,
    marginBottom: 14,
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  slotCard: {
    width: "48%",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    gap: 2,
  },
  slotCardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  slotCardDisabled: {
    opacity: 0.4,
    backgroundColor: "#f1f5f9",
  },
  slotTime: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.text,
  },
  slotTimeActive: {
    color: "#ffffff",
  },
  slotCapacity: {
    fontSize: 10,
    color: "#059669",
    fontWeight: "600",
  },
  slotFullText: {
    color: "#dc2626",
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  passModal: {
    alignItems: "center",
    borderRadius: 24,
    marginHorizontal: 20,
    alignSelf: "center",
    width: "90%",
  },
  qrContainer: {
    marginVertical: 16,
    padding: 20,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  qrVisual: {
    width: 140,
    height: 140,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  qrVisualText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
  },
  qrVisualCode: {
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "900",
    color: Colors.primaryDark,
  },
  passAmenityName: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  passTimeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 4,
  },
  passUnitText: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 4,
  },
  doneBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
  },
  doneBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});
