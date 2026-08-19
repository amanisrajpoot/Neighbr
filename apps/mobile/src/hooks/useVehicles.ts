import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useAuthStore } from "../store/authStore";

export interface VehicleItem {
  id: string;
  society_id: string;
  unit_id?: string;
  owner_id: string;
  vehicle_type: "car" | "bike" | "ev" | "scooter";
  vehicle_number: string;
  make_model?: string;
  parking_slot?: string;
  rfid_tag?: string;
  is_verified: boolean;
  created_at: string;
}

export interface RegisterVehiclePayload {
  vehicle_number: string;
  vehicle_type: "car" | "bike" | "ev" | "scooter";
  make_model?: string;
  parking_slot?: string;
  unit_id?: string;
}

export function useVehicles() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const societyId = user?.societyId;
  const unitId = user?.unitId;

  // Query: Get vehicles for current unit / society
  const {
    data: vehicles = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["vehicles", societyId, unitId],
    queryFn: async () => {
      if (!societyId) return [];
      const endpoint = unitId
        ? `/societies/${societyId}/vehicles?unit_id=${unitId}`
        : `/societies/${societyId}/vehicles`;
      return apiClient<VehicleItem[]>(endpoint).catch(() => []);
    },
    enabled: Boolean(societyId),
  });

  // Mutation: Register vehicle
  const registerVehicleMutation = useMutation({
    mutationFn: async (payload: RegisterVehiclePayload) => {
      if (!societyId) throw new Error("Missing society context");
      return apiClient<VehicleItem>(`/societies/${societyId}/vehicles`, {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          unit_id: payload.unit_id || unitId,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles", societyId] });
    },
  });

  // Mutation: Delete vehicle
  const deleteVehicleMutation = useMutation({
    mutationFn: async (vehicleId: string) => {
      if (!societyId) throw new Error("Missing society context");
      return apiClient(`/societies/${societyId}/vehicles/${vehicleId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles", societyId] });
    },
  });

  return {
    vehicles,
    isLoading,
    refetch,
    registerVehicle: registerVehicleMutation.mutateAsync,
    deleteVehicle: deleteVehicleMutation.mutateAsync,
  };
}
