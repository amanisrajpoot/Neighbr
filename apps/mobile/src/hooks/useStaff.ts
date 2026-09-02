import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useAuthStore } from "../store/authStore";

export interface StaffMember {
  id: string;
  society_id: string;
  name: string;
  phone: string;
  role: string;
  pass_code: string;
  photo_url?: string;
  is_active: boolean;
  status?: "INSIDE" | "OUTSIDE";
  last_entry?: string;
  created_at: string;
}

export interface StaffAssignment {
  id: string;
  staff_id: string;
  unit_id: string;
  role: string;
  schedule?: string;
  staff?: StaffMember;
}

export function useStaff() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const societyId = user?.societyId;
  const unitId = user?.unitId;

  // Query: Get staff assigned to current resident unit
  const {
    data: unitStaff = [],
    isLoading: isLoadingUnitStaff,
    refetch: refetchUnitStaff,
  } = useQuery({
    queryKey: ["unitStaff", societyId, unitId],
    queryFn: async () => {
      if (!societyId || !unitId) return [];
      return apiClient<StaffMember[]>(
        `/societies/${societyId}/units/${unitId}/staff`
      );
    },
    enabled: Boolean(societyId && unitId),
  });

  // Query: Get all society staff directory
  const {
    data: allStaff = [],
    isLoading: isLoadingAllStaff,
  } = useQuery({
    queryKey: ["allStaff", societyId],
    queryFn: async () => {
      if (!societyId) return [];
      return apiClient<StaffMember[]>(`/societies/${societyId}/staff`);
    },
    enabled: Boolean(societyId),
  });

  // Mutation: Assign staff to unit
  const assignStaffMutation = useMutation({
    mutationFn: async ({
      staffId,
      schedule,
    }: {
      staffId: string;
      schedule?: string;
    }) => {
      if (!societyId || !unitId) throw new Error("Missing society or unit");
      return apiClient<StaffAssignment>(
        `/societies/${societyId}/staff/${staffId}/assign`,
        {
          method: "POST",
          body: JSON.stringify({
            unit_id: unitId,
            schedule: schedule || "Daily",
          }),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unitStaff", societyId, unitId] });
    },
  });

  // Mutation: Guard staff check-in
  const staffCheckInMutation = useMutation({
    mutationFn: async ({
      staffId,
      gateId,
    }: {
      staffId: string;
      gateId?: string;
    }) => {
      if (!societyId) throw new Error("Missing society context");
      return apiClient(`/societies/${societyId}/staff/${staffId}/check-in`, {
        method: "POST",
        body: JSON.stringify({ gate_id: gateId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allStaff", societyId] });
      queryClient.invalidateQueries({ queryKey: ["unitStaff", societyId, unitId] });
    },
  });

  // Mutation: Guard staff check-out
  const staffCheckOutMutation = useMutation({
    mutationFn: async ({
      staffId,
      gateId,
    }: {
      staffId: string;
      gateId?: string;
    }) => {
      if (!societyId) throw new Error("Missing society context");
      return apiClient(`/societies/${societyId}/staff/${staffId}/check-out`, {
        method: "POST",
        body: JSON.stringify({ gate_id: gateId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allStaff", societyId] });
      queryClient.invalidateQueries({ queryKey: ["unitStaff", societyId, unitId] });
    },
  });

  return {
    unitStaff,
    allStaff,
    isLoadingUnitStaff,
    isLoadingAllStaff,
    refetchUnitStaff,
    assignStaff: assignStaffMutation.mutateAsync,
    staffCheckIn: staffCheckInMutation.mutateAsync,
    staffCheckOut: staffCheckOutMutation.mutateAsync,
  };
}
