import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useAuthStore } from "../store/authStore";

export interface FamilyMemberItem {
  id: string;
  membership_id: string;
  society_id: string;
  name: string;
  phone?: string | null;
  relation?: string | null;
  age_group?: string | null;
  photo_url?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AddFamilyMemberPayload {
  name: string;
  phone?: string;
  relation?: string;
  age_group?: string;
  photo_url?: string;
}

export function useFamilyMembers() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const societyId = user?.societyId;
  const membershipId = user?.membershipId;

  const {
    data: familyMembers = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["familyMembers", societyId, membershipId],
    queryFn: async () => {
      if (!societyId) return [];
      // If we don't have membershipId directly, get it from /societies/my-memberships
      let activeMemId = membershipId;
      if (!activeMemId) {
        const mems = await apiClient<any[]>("/societies/my-memberships").catch(() => []);
        const target = mems.find((m: any) => m.society_id === societyId) || mems[0];
        if (target) activeMemId = target.id;
      }
      if (!activeMemId) return [];
      return apiClient<FamilyMemberItem[]>(
        `/societies/${societyId}/memberships/${activeMemId}/family`
      );
    },
    enabled: Boolean(societyId),
  });

  const addFamilyMemberMutation = useMutation({
    mutationFn: async (payload: AddFamilyMemberPayload) => {
      if (!societyId) throw new Error("Missing society context");
      let activeMemId = membershipId;
      if (!activeMemId) {
        const mems = await apiClient<any[]>("/societies/my-memberships").catch(() => []);
        const target = mems.find((m: any) => m.society_id === societyId) || mems[0];
        if (target) activeMemId = target.id;
      }
      if (!activeMemId) throw new Error("Missing membership record for active resident");

      return apiClient<FamilyMemberItem>(
        `/societies/${societyId}/memberships/${activeMemId}/family`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
    },
  });

  return {
    familyMembers,
    isLoading,
    isError,
    error,
    refetch,
    addFamilyMember: addFamilyMemberMutation.mutateAsync,
    isAdding: addFamilyMemberMutation.isPending,
  };
}
