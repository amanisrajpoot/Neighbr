import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useAuthStore } from "../store/authStore";

export interface CommentItem {
  id: string;
  ticket_id: string;
  author_id: string;
  author_name?: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

export interface TicketItem {
  id: string;
  society_id: string;
  unit_id?: string;
  unit_number?: string;
  created_by: string;
  creator_name?: string;
  assigned_to?: string;
  assignee_name?: string;
  category: string;
  priority: "low" | "normal" | "high" | "urgent";
  title: string;
  description: string;
  images: string[];
  status: "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "REOPENED";
  resolution_notes?: string;
  rating?: number;
  feedback?: string;
  sla_due_at?: string;
  resolved_at?: string;
  closed_at?: string;
  created_at: string;
  comments: CommentItem[];
}

export interface CreateTicketPayload {
  category: string;
  priority?: string;
  title: string;
  description: string;
  images?: string[];
  unit_id?: string;
}

export function useHelpdesk() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const societyId = user?.societyId;
  const unitId = user?.unitId;

  // Query: Get tickets for resident's unit
  const {
    data: tickets = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["helpdeskTickets", societyId, unitId],
    queryFn: async () => {
      if (!societyId) return [];
      const endpoint = unitId
        ? `/societies/${societyId}/helpdesk/tickets?unit_id=${unitId}`
        : `/societies/${societyId}/helpdesk/tickets`;
      return apiClient<TicketItem[]>(endpoint);
    },
    enabled: Boolean(societyId),
  });

  // Mutation: Create ticket
  const createTicketMutation = useMutation({
    mutationFn: async (payload: CreateTicketPayload) => {
      if (!societyId) throw new Error("Missing society context");
      return apiClient<TicketItem>(`/societies/${societyId}/helpdesk/tickets`, {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          unit_id: payload.unit_id || unitId,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helpdeskTickets", societyId] });
    },
  });

  // Mutation: Add comment to ticket
  const addCommentMutation = useMutation({
    mutationFn: async ({
      ticketId,
      message,
    }: {
      ticketId: string;
      message: string;
    }) => {
      if (!societyId) throw new Error("Missing society context");
      return apiClient<CommentItem>(
        `/societies/${societyId}/helpdesk/tickets/${ticketId}/comments`,
        {
          method: "POST",
          body: JSON.stringify({ message }),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helpdeskTickets", societyId] });
    },
  });

  // Mutation: Rate resolution
  const rateTicketMutation = useMutation({
    mutationFn: async ({
      ticketId,
      rating,
      feedback,
    }: {
      ticketId: string;
      rating: number;
      feedback?: string;
    }) => {
      if (!societyId) throw new Error("Missing society context");
      return apiClient<TicketItem>(
        `/societies/${societyId}/helpdesk/tickets/${ticketId}/rate`,
        {
          method: "POST",
          body: JSON.stringify({ rating, feedback }),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helpdeskTickets", societyId] });
    },
  });

  return {
    tickets,
    isLoading,
    isError,
    error,
    refetch,
    createTicket: createTicketMutation.mutateAsync,
    addComment: addCommentMutation.mutateAsync,
    rateTicket: rateTicketMutation.mutateAsync,
  };
}
