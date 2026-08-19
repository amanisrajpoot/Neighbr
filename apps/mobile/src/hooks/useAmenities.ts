import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useAuthStore } from "../store/authStore";

export interface AmenityItem {
  id: string;
  society_id: string;
  name: string;
  code: string;
  category: string;
  description?: string;
  image_url?: string;
  capacity_per_slot: number;
  slot_duration_minutes: number;
  open_time: string;
  close_time: string;
  rules: string[];
  is_paid: boolean;
  price_per_slot: number;
  is_active: boolean;
}

export interface SlotInfo {
  start_time: string;
  end_time: string;
  max_capacity: number;
  booked_count: number;
  available_capacity: number;
  is_available: boolean;
}

export interface BookingItem {
  id: string;
  society_id: string;
  amenity_id: string;
  amenity_name?: string;
  unit_id?: string;
  unit_number?: string;
  booked_by: string;
  user_name?: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  guest_count: number;
  total_amount: number;
  status: "CONFIRMED" | "CANCELLED" | "COMPLETED";
  qr_pass: string;
  cancellation_reason?: string;
  created_at: string;
}

export function useAmenities() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const societyId = user?.societyId;
  const unitId = user?.unitId;

  // Query: Get active amenities
  const {
    data: amenities = [],
    isLoading: isLoadingAmenities,
    refetch: refetchAmenities,
  } = useQuery({
    queryKey: ["amenities", societyId],
    queryFn: async () => {
      if (!societyId) return [];
      return apiClient<AmenityItem[]>(`/societies/${societyId}/amenities`).catch(() => []);
    },
    enabled: Boolean(societyId),
  });

  // Query: Get resident bookings
  const {
    data: myBookings = [],
    isLoading: isLoadingBookings,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: ["amenityBookings", societyId, user?.id],
    queryFn: async () => {
      if (!societyId || !user?.id) return [];
      return apiClient<BookingItem[]>(
        `/societies/${societyId}/amenities/bookings?user_id=${user.id}`
      ).catch(() => []);
    },
    enabled: Boolean(societyId && user?.id),
  });

  // Fetch slots function
  const fetchSlots = async (amenityId: string, date: string): Promise<SlotInfo[]> => {
    if (!societyId) return [];
    return apiClient<SlotInfo[]>(
      `/societies/${societyId}/amenities/${amenityId}/slots?date=${date}`
    ).catch(() => []);
  };

  // Mutation: Book slot
  const bookSlotMutation = useMutation({
    mutationFn: async ({
      amenityId,
      bookingDate,
      startTime,
      endTime,
      guestCount = 1,
    }: {
      amenityId: string;
      bookingDate: string;
      startTime: string;
      endTime: string;
      guestCount?: number;
    }) => {
      if (!societyId) throw new Error("Missing society context");
      return apiClient<BookingItem>(
        `/societies/${societyId}/amenities/${amenityId}/book`,
        {
          method: "POST",
          body: JSON.stringify({
            booking_date: bookingDate,
            start_time: startTime,
            end_time: endTime,
            guest_count: guestCount,
            unit_id: unitId,
          }),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["amenityBookings"] });
    },
  });

  // Mutation: Cancel booking
  const cancelBookingMutation = useMutation({
    mutationFn: async ({
      bookingId,
      reason,
    }: {
      bookingId: string;
      reason?: string;
    }) => {
      if (!societyId) throw new Error("Missing society context");
      return apiClient<BookingItem>(
        `/societies/${societyId}/amenities/bookings/${bookingId}/cancel`,
        {
          method: "POST",
          body: JSON.stringify({ reason }),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["amenityBookings"] });
    },
  });

  return {
    amenities,
    myBookings,
    isLoadingAmenities,
    isLoadingBookings,
    refetchAmenities,
    refetchBookings,
    fetchSlots,
    bookSlot: bookSlotMutation.mutateAsync,
    cancelBooking: cancelBookingMutation.mutateAsync,
  };
}
