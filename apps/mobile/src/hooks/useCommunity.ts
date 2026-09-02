import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useAuthStore } from "../store/authStore";

export interface CommentItem {
  id: string;
  author_id: string;
  author_name?: string;
  content: string;
  created_at: string;
}

export interface PostItem {
  id: string;
  society_id: string;
  author_id: string;
  author_name?: string;
  unit_number?: string;
  title: string;
  content: string;
  category: string;
  images: string[];
  likes_count: number;
  is_pinned: boolean;
  created_at: string;
  comments: CommentItem[];
}

export interface PollStats {
  index: number;
  text: string;
  vote_count: number;
  percentage: number;
}

export interface PollItem {
  id: string;
  society_id: string;
  author_name?: string;
  question: string;
  description?: string;
  options: string[];
  total_votes: number;
  stats: PollStats[];
  user_voted_option?: number;
  is_active: boolean;
  created_at: string;
}

export function useCommunity() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const societyId = user?.societyId;
  const unitId = user?.unitId;

  // Query: Get posts
  const {
    data: posts = [],
    isLoading: isLoadingPosts,
    refetch: refetchPosts,
  } = useQuery({
    queryKey: ["communityPosts", societyId],
    queryFn: async () => {
      if (!societyId) return [];
      return apiClient<PostItem[]>(`/societies/${societyId}/community/posts`);
    },
    enabled: Boolean(societyId),
  });

  // Query: Get polls
  const {
    data: polls = [],
    isLoading: isLoadingPolls,
    refetch: refetchPolls,
  } = useQuery({
    queryKey: ["communityPolls", societyId],
    queryFn: async () => {
      if (!societyId) return [];
      return apiClient<PollItem[]>(`/societies/${societyId}/community/polls`);
    },
    enabled: Boolean(societyId),
  });

  // Mutation: Create post
  const createPostMutation = useMutation({
    mutationFn: async ({
      title,
      content,
      category = "general",
    }: {
      title: string;
      content: string;
      category?: string;
    }) => {
      if (!societyId) throw new Error("Missing society context");
      return apiClient<PostItem>(`/societies/${societyId}/community/posts`, {
        method: "POST",
        body: JSON.stringify({ title, content, category, unit_id: unitId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communityPosts", societyId] });
    },
  });

  // Mutation: Add comment
  const addCommentMutation = useMutation({
    mutationFn: async ({
      postId,
      content,
    }: {
      postId: string;
      content: string;
    }) => {
      if (!societyId) throw new Error("Missing society context");
      return apiClient<CommentItem>(
        `/societies/${societyId}/community/posts/${postId}/comments`,
        {
          method: "POST",
          body: JSON.stringify({ content }),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communityPosts", societyId] });
    },
  });

  // Mutation: Like post
  const likePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!societyId) throw new Error("Missing society context");
      return apiClient(`/societies/${societyId}/community/posts/${postId}/like`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communityPosts", societyId] });
    },
  });

  // Mutation: Vote on poll
  const votePollMutation = useMutation({
    mutationFn: async ({
      pollId,
      optionIndex,
    }: {
      pollId: string;
      optionIndex: number;
    }) => {
      if (!societyId) throw new Error("Missing society context");
      return apiClient<PollItem[]>(
        `/societies/${societyId}/community/polls/${pollId}/vote`,
        {
          method: "POST",
          body: JSON.stringify({ option_index: optionIndex, unit_id: unitId }),
        }
      );
    },
    onSuccess: (updatedPolls) => {
      queryClient.setQueryData(["communityPolls", societyId], updatedPolls);
    },
  });

  return {
    posts,
    polls,
    isLoadingPosts,
    isLoadingPolls,
    refetchPosts,
    refetchPolls,
    createPost: createPostMutation.mutateAsync,
    addComment: addCommentMutation.mutateAsync,
    likePost: likePostMutation.mutateAsync,
    votePoll: votePollMutation.mutateAsync,
  };
}
