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
    triggerSOS: triggerSOSMutation.mutateAsync,
    isTriggeringSOS: triggerSOSMutation.isPending,
  };
}
