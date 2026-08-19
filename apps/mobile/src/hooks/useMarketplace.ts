import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useAuthStore } from "../store/authStore";

export interface ListingItem {
  id: string;
  society_id: string;
  seller_id: string;
  seller_name?: string;
  seller_phone?: string;
  unit_number?: string;
  title: string;
  description: string;
  category: string;
  price: number;
  is_free: boolean;
  images: string[];
  status: "ACTIVE" | "SOLD" | "RESERVED";
  created_at: string;
}

export interface VendorItem {
  id: string;
  society_id: string;
  vendor_name: string;
  category: string;
  description?: string;
  contact_phone: string;
  is_verified: boolean;
  rating: number;
  review_count: number;
  pricing_starts_at: number;
  is_active: boolean;
}

export interface BookingItem {
  id: string;
  vendor_id: string;
  vendor_name?: string;
  vendor_phone?: string;
  booking_date: string;
  time_slot: string;
  gate_pass_code: string;
  status: string;
  created_at: string;
}

export function useMarketplace() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const societyId = user?.societyId;
  const unitId = user?.unitId;

  // Query: Marketplace Listings
  const {
    data: listings = [],
    isLoading: isLoadingListings,
    refetch: refetchListings,
  } = useQuery({
    queryKey: ["marketplaceListings", societyId],
    queryFn: async () => {
      if (!societyId) return [];
      return apiClient<ListingItem[]>(`/societies/${societyId}/marketplace/listings`).catch(() => []);
    },
    enabled: Boolean(societyId),
  });

  // Query: Verified Vendors
  const {
    data: vendors = [],
    isLoading: isLoadingVendors,
    refetch: refetchVendors,
  } = useQuery({
    queryKey: ["marketplaceVendors", societyId],
    queryFn: async () => {
      if (!societyId) return [];
      return apiClient<VendorItem[]>(`/societies/${societyId}/marketplace/vendors`).catch(() => []);
    },
    enabled: Boolean(societyId),
  });

  // Query: Resident Bookings
  const {
    data: bookings = [],
    isLoading: isLoadingBookings,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: ["serviceBookings", societyId],
    queryFn: async () => {
      if (!societyId) return [];
      return apiClient<BookingItem[]>(`/societies/${societyId}/marketplace/bookings`).catch(() => []);
    },
    enabled: Boolean(societyId),
  });

  // Mutation: Create Listing
  const createListingMutation = useMutation({
    mutationFn: async ({
      title,
      description,
      category,
      price,
      is_free,
    }: {
      title: string;
      description: string;
      category: string;
      price: number;
      is_free: boolean;
    }) => {
      if (!societyId) throw new Error("Missing society context");
      return apiClient<ListingItem>(`/societies/${societyId}/marketplace/listings`, {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          category,
          price,
          is_free,
          unit_id: unitId,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplaceListings", societyId] });
    },
  });

  // Mutation: Book Vendor
  const bookVendorMutation = useMutation({
    mutationFn: async ({
      vendorId,
      bookingDate,
      timeSlot,
      notes,
    }: {
      vendorId: string;
      bookingDate: string;
      timeSlot: string;
      notes?: string;
    }) => {
      if (!societyId) throw new Error("Missing society context");
      return apiClient<BookingItem>(`/societies/${societyId}/marketplace/bookings`, {
        method: "POST",
        body: JSON.stringify({
          vendor_id: vendorId,
          booking_date: bookingDate,
          time_slot: timeSlot,
          notes,
          unit_id: unitId,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["serviceBookings", societyId] });
    },
  });

  return {
    listings,
    vendors,
    bookings,
    isLoadingListings,
    isLoadingVendors,
    isLoadingBookings,
    refetchListings,
    refetchVendors,
    refetchBookings,
    createListing: createListingMutation.mutateAsync,
    bookVendor: bookVendorMutation.mutateAsync,
  };
}
