import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useAuthStore } from "../store/authStore";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggested_actions?: string[];
  timestamp: string;
}

export interface ChatResponse {
  reply: string;
  suggested_actions: string[];
}

export function useAI() {
  const { user } = useAuthStore();
  const societyId = user?.societyId;

  const sendMessageMutation = useMutation({
    mutationFn: async ({
      message,
      history = [],
    }: {
      message: string;
      history?: Array<{ role: string; content: string }>;
    }) => {
      if (!societyId) throw new Error("Missing society context");
      return apiClient<ChatResponse>(`/societies/${societyId}/ai/chat`, {
        method: "POST",
        body: JSON.stringify({ message, history }),
      });
    },
  });

  return {
    sendMessage: sendMessageMutation.mutateAsync,
    isThinking: sendMessageMutation.isPending,
  };
}
