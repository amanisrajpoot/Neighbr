import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useAuthStore } from "../store/authStore";

export interface NoticeItem {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: string;
  published_at: string;
}

export interface EmergencyContactItem {
  id: string;
  society_id: string;
  name: string;
  phone: string;
  designation?: string;
  category?: string;
  is_active: boolean;
}

export function useNotices() {
  const user = useAuthStore((state) => state.user);

  const noticesQuery = useQuery({
    queryKey: ["notices", user?.societyId],
    queryFn: async () => {
      if (!user?.societyId) return [];
      return apiClient<NoticeItem[]>(`/societies/${user.societyId}/notices`);
    },
    enabled: !!user?.societyId,
  });

  const emergencyContactsQuery = useQuery({
    queryKey: ["emergencyContacts", user?.societyId],
    queryFn: async () => {
      if (!user?.societyId) return [];
      return apiClient<EmergencyContactItem[]>(`/societies/${user.societyId}/emergency-contacts`);
    },
    enabled: !!user?.societyId,
  });

  const triggerSOSMutation = useMutation({
    mutationFn: async (payload?: { sos_type?: string; message?: string; location?: any }) => {
      if (!user?.societyId) throw new Error("No society selected");
      return apiClient(`/societies/${user.societyId}/sos`, {
        method: "POST",
        body: JSON.stringify({
          sos_type: payload?.sos_type || "security",
          message: payload?.message || `Emergency SOS triggered by resident in ${user?.unitNumber || "Estate"}`,
          location: payload?.location || { unit: user?.unitNumber || "Villa-42" },
        }),
      });
    },
  });

  return {
    notices: noticesQuery.data || [],
    isLoading: noticesQuery.isLoading,
    isError: noticesQuery.isError,
    error: noticesQuery.error,
    refetch: noticesQuery.refetch,
    emergencyContacts: emergencyContactsQuery.data || [],
    isLoadingContacts: emergencyContactsQuery.isLoading,
    refetchContacts: emergencyContactsQuery.refetch,
    triggerSOS: triggerSOSMutation.mutateAsync,
    isTriggeringSOS: triggerSOSMutation.isPending,
  };
}

