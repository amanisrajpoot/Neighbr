import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useAuthStore } from "../store/authStore";

export interface VisitorPassItem {
  id: string;
  society_id: string;
  unit_id: string;
  pass_type: string;
  visitor_name: string;
  visitor_phone?: string;
  vehicle_number?: string;
  pass_code?: string;
  qr_token: string;
  valid_from: string;
  valid_until: string;
  status: string;
}

export interface CreatePassPayload {
  unit_id: string;
  pass_type: string;
  visitor_name: string;
  visitor_phone?: string;
  vehicle_number?: string;
  purpose?: string;
  valid_from: string;
  valid_until: string;
}

export function usePasses() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const passesQuery = useQuery({
    queryKey: ["passes", user?.societyId],
    queryFn: async () => {
      if (!user?.societyId) return [];
      return apiClient<VisitorPassItem[]>(`/societies/${user.societyId}/visitors/passes`);
    },
    enabled: !!user?.societyId,
  });

  const createPassMutation = useMutation({
    mutationFn: async (payload: CreatePassPayload) => {
      if (!user?.societyId) throw new Error("No active society");
      return apiClient<VisitorPassItem>(`/societies/${user.societyId}/visitors/passes`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passes"] });
    },
  });

  const approvePassMutation = useMutation({
    mutationFn: async (passId: string) => {
      if (!user?.societyId) throw new Error("No active society");
      return apiClient<VisitorPassItem>(`/societies/${user.societyId}/visitors/passes/${passId}/approve`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passes"] });
    },
  });

  const rejectPassMutation = useMutation({
    mutationFn: async (passId: string) => {
      if (!user?.societyId) throw new Error("No active society");
      return apiClient<VisitorPassItem>(`/societies/${user.societyId}/visitors/passes/${passId}/reject`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passes"] });
    },
  });

  const revokePassMutation = useMutation({
    mutationFn: async (passId: string) => {
      if (!user?.societyId) throw new Error("No active society");
      return apiClient<VisitorPassItem>(`/societies/${user.societyId}/visitors/passes/${passId}/revoke`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passes"] });
    },
  });

  return {
    passes: passesQuery.data || [],
    isLoading: passesQuery.isLoading,
    isError: passesQuery.isError,
    error: passesQuery.error,
    refetch: passesQuery.refetch,
    createPass: createPassMutation.mutateAsync,
    isCreating: createPassMutation.isPending,
    approvePass: approvePassMutation.mutateAsync,
    isApproving: approvePassMutation.isPending,
    rejectPass: rejectPassMutation.mutateAsync,
    isRejecting: rejectPassMutation.isPending,
    revokePass: revokePassMutation.mutateAsync,
    isRevoking: revokePassMutation.isPending,
  };
}

