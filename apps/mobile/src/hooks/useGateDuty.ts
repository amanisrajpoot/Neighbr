import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useAuthStore } from "../store/authStore";

export interface InsideVisitorItem {
  id: string;
  visitor_name: string;
  unit_id: string;
  vehicle_number?: string;
  status: string;
}

export function useGateDuty(gateId: string = "default-gate") {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const insideQuery = useQuery({
    queryKey: ["inside-visitors", user?.societyId],
    queryFn: async () => {
      if (!user?.societyId) return [];
      return apiClient<InsideVisitorItem[]>(`/societies/${user.societyId}/visitors/inside`);
    },
    enabled: !!user?.societyId,
  });

  const checkInMutation = useMutation({
    mutationFn: async (payload: { qr_token?: string; visitor_name?: string; unit_id?: string; idempotency_key: string }) => {
      if (!user?.societyId) throw new Error("No active society");
      return apiClient(`/societies/${user.societyId}/gates/${gateId}/check-in`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inside-visitors"] });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (payload: { pass_id?: string; idempotency_key: string }) => {
      if (!user?.societyId) throw new Error("No active society");
      return apiClient(`/societies/${user.societyId}/gates/${gateId}/check-out`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inside-visitors"] });
    },
  });

  return {
    insideVisitors: insideQuery.data || [],
    isLoading: insideQuery.isLoading,
    checkIn: checkInMutation.mutateAsync,
    checkOut: checkOutMutation.mutateAsync,
  };
}
