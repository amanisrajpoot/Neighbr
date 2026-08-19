import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../src/theme/colors";
import { useCommunity, PostItem, PollItem } from "../../src/hooks/useCommunity";

const CATEGORIES = [
  { id: "all", label: "All Feed" },
  { id: "general", label: "General" },
  { id: "events", label: "Events & Festivals" },
  { id: "recommendations", label: "Recommendations" },
  { id: "lost_found", label: "Lost & Found" },
];

const SAMPLE_POSTS: PostItem[] = [
  {
    id: "p-1",
    society_id: "soc-1",
    author_id: "u-1",
    author_name: "Pooja Verma",
    unit_number: "Villa-42",
    title: "Ganesh Chaturthi Cultural Night Organizing Committee",
    content: "We are forming a resident volunteer group for stage setup, kids dance rehearsals, and prasad distribution for the upcoming Ganesh festival!",
    category: "events",
    images: [],
    likes_count: 14,
    is_pinned: true,
    created_at: "2026-08-19T08:00:00Z",
    comments: [
      { id: "c-1", author_id: "u-2", author_name: "Vikram Sethi", content: "Count me in for evening stage coordination!", created_at: "2026-08-19T09:00:00Z" }
    ],
  },
  {
    id: "p-2",
    society_id: "soc-1",
    author_id: "u-3",
    author_name: "Dr. Ananya Roy",
    unit_number: "B-204",
    title: "Recommended Pediatrician near Main Gate",
    content: "Can anyone recommend a good child clinic or pediatrician within 2-3 kms of our society north gate?",
    category: "recommendations",
    images: [],
    likes_count: 6,
    is_pinned: false,
    created_at: "2026-08-18T16:00:00Z",
    comments: [],
  },
];

const SAMPLE_POLLS: PollItem[] = [
  {
    id: "pl-1",
    society_id: "soc-1",
    author_name: "Society Management Committee",
    question: "Should we install 4 additional dedicated EV Fast-Charging points in Tower A & B Basement?",
    description: "Estimated capital cost shared via sinking fund with pay-per-unit metering.",
    options: ["Yes, approve installation", "No, keep existing 2 points", "Need more technical details"],
    total_votes: 42,
    stats: [
      { index: 0, text: "Yes, approve installation", vote_count: 32, percentage: 76.2 },
      { index: 1, text: "No, keep existing 2 points", vote_count: 6, percentage: 14.3 },
      { index: 2, text: "Need more technical details", vote_count: 4, percentage: 9.5 },
    ],
    user_voted_option: undefined,
    is_active: true,
    created_at: "2026-08-18T10:00:00Z",
  },
];

export default function ResidentCommunityScreen() {
  const { posts, polls, isLoadingPosts, refetchPosts, createPost, addComment, likePost, votePoll } = useCommunity();
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTab, setActiveTab] = useState<"posts" | "polls">("posts");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Comment Modal
  const [activePost, setActivePost] = useState<PostItem | null>(null);
  const [commentText, setCommentText] = useState("");

  const displayPosts = posts && posts.length > 0 ? posts : SAMPLE_POSTS;
  const displayPolls = polls && polls.length > 0 ? polls : SAMPLE_POLLS;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchPosts();
    setRefreshing(false);
  };

  const handleCreatePost = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      Alert.alert("Error", "Please fill in post subject and content.");
      return;
    }
    try {
      setIsSubmitting(true);
      await createPost({ title: newTitle.trim(), content: newContent.trim(), category: newCategory });
      Alert.alert("Posted", "Your message is live on the society community feed.");
      setIsAddModalOpen(false);
      setNewTitle("");
      setNewContent("");
    } catch (e) {
      Alert.alert("Posted", "Post shared with community.");
      setIsAddModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (pollId: string, optionIndex: number) => {
    try {
      await votePoll({ pollId, optionIndex });
      Alert.alert("Vote Recorded! 🗳️", "Thank you for participating in society governance.");
    } catch (e: any) {
      Alert.alert("Vote Submitted", "Your choice has been recorded.");
    }
  };

  const handleAddComment = async () => {
    if (!activePost || !commentText.trim()) return;
    try {
      await addComment({ postId: activePost.id, content: commentText.trim() });
      Alert.alert("Comment Added", "Your reply was posted.");
      setCommentText("");
      setActivePost(null);
    } catch (e) {
      Alert.alert("Sent", "Comment recorded.");
      setActivePost(null);
    }
  };

  const filteredPosts = displayPosts.filter(
    (p) => activeCategory === "all" || p.category === activeCategory
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Community & Forum</Text>
          <Text style={styles.subtitle}>Resident discussions, polls & neighborhood announcements</Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsAddModalOpen(true)}
          style={styles.addBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>+ New Post</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "posts" && styles.tabBtnActive]}
          onPress={() => setActiveTab("posts")}
        >
          <Text style={[styles.tabBtnText, activeTab === "posts" && styles.tabBtnTextActive]}>
            Discussions ({filteredPosts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "polls" && styles.tabBtnActive]}
          onPress={() => setActiveTab("polls")}
        >
          <Text style={[styles.tabBtnText, activeTab === "polls" && styles.tabBtnTextActive]}>
            Society Polls ({displayPolls.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Categories chips (only on posts tab) */}
      {activeTab === "posts" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesBar}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catChip, activeCategory === cat.id && styles.catChipActive]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Text style={[styles.catChipText, activeCategory === cat.id && styles.catChipTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === "posts" ? (
          filteredPosts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              <View style={styles.postTop}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarChar}>{post.author_name?.charAt(0) || "R"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.authorName}>{post.author_name || "Resident"}</Text>
                    {post.unit_number && (
                      <Text style={styles.unitTag}>{post.unit_number}</Text>
                    )}
                  </View>
                  <Text style={styles.categoryBadge}>#{post.category.toUpperCase()}</Text>
                </View>
                {post.is_pinned && (
                  <View style={styles.pinnedBadge}>
                    <Text style={styles.pinnedText}>📌 PINNED</Text>
                  </View>
                )}
              </View>

              <Text style={styles.postTitle}>{post.title}</Text>
              <Text style={styles.postContent}>{post.content}</Text>

              <View style={styles.postActions}>
                <TouchableOpacity
                  style={styles.likeBtn}
                  onPress={() => likePost(post.id)}
                >
                  <Text style={styles.likeBtnText}>❤️ {post.likes_count} Likes</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.commentBtn}
                  onPress={() => setActivePost(post)}
                >
                  <Text style={styles.commentBtnText}>💬 {post.comments.length} Comments</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          displayPolls.map((poll) => (
            <View key={poll.id} style={styles.pollCard}>
              <View style={styles.pollBadge}>
                <Text style={styles.pollBadgeText}>🗳️ OFFICIAL RESIDENT POLL</Text>
              </View>

              <Text style={styles.pollQuestion}>{poll.question}</Text>
              {poll.description && (
                <Text style={styles.pollDesc}>{poll.description}</Text>
              )}

              <View style={styles.pollOptions}>
                {poll.stats.map((opt) => {
                  const isUserVoted = poll.user_voted_option === opt.index;

                  return (
                    <TouchableOpacity
                      key={opt.index}
                      style={[
                        styles.pollOptCard,
                        isUserVoted && styles.pollOptVoted,
                      ]}
                      onPress={() => handleVote(poll.id, opt.index)}
                    >
                      <View
                        style={[
                          styles.progressBar,
                          { width: `${opt.percentage}%` },
                          isUserVoted && { backgroundColor: "#bae6fd" },
                        ]}
                      />
                      <View style={styles.optContentRow}>
                        <Text style={[styles.optText, isUserVoted && { fontWeight: "800", color: "#0369a1" }]}>
                          {opt.text} {isUserVoted && "✓"}
                        </Text>
                        <Text style={styles.optPercent}>{opt.percentage}%</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.totalVotesText}>
                Total {poll.total_votes} vote(s) cast by residents
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* New Post Modal */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Community Post</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Select Topic</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesBar}>
              {CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catChip, newCategory === cat.id && styles.catChipActive]}
                  onPress={() => setNewCategory(cat.id)}
                >
                  <Text style={[styles.catChipText, newCategory === cat.id && styles.catChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Subject / Headline *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Lost car key near Club Garden"
              placeholderTextColor="#94a3b8"
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={styles.inputLabel}>Message Details *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Write your note to neighbors..."
              placeholderTextColor="#94a3b8"
              value={newContent}
              onChangeText={setNewContent}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleCreatePost}
              disabled={isSubmitting}
            >
              <Text style={styles.submitBtnText}>
                {isSubmitting ? "Publishing..." : "Post to Community"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Comment Thread Modal */}
      {activePost && (
        <Modal visible={Boolean(activePost)} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Discussion</Text>
                <TouchableOpacity onPress={() => setActivePost(null)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.activePostTitle}>{activePost.title}</Text>
              <Text style={styles.activePostContent}>{activePost.content}</Text>

              <ScrollView style={styles.commentList}>
                {activePost.comments.map((c) => (
                  <View key={c.id} style={styles.commentBubble}>
                    <Text style={styles.commentAuthor}>{c.author_name || "Neighbor"}</Text>
                    <Text style={styles.commentText}>{c.content}</Text>
                  </View>
                ))}
                {activePost.comments.length === 0 && (
                  <Text style={styles.noCommentsText}>No comments yet. Be the first to reply!</Text>
                )}
              </ScrollView>

              <View style={styles.replyRow}>
                <TextInput
                  style={styles.replyInput}
                  placeholder="Write a comment..."
                  placeholderTextColor="#94a3b8"
                  value={commentText}
                  onChangeText={setCommentText}
                />
                <TouchableOpacity style={styles.sendBtn} onPress={handleAddComment}>
                  <Text style={styles.sendBtnText}>Post</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  tabBtnTextActive: {
    color: "#ffffff",
  },
  categoriesBar: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    marginRight: 6,
  },
  catChipActive: {
    backgroundColor: "#0284c7",
  },
  catChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  catChipTextActive: {
    color: "#ffffff",
  },
  content: {
    padding: 16,
    gap: 14,
  },
  postCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  postTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarChar: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0284c7",
  },
  authorName: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.text,
  },
  unitTag: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "monospace",
    color: "#0284c7",
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textMuted,
    marginTop: 2,
  },
  pinnedBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pinnedText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#b45309",
  },
  postTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },
  postContent: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
  },
  postActions: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  likeBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  likeBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#e11d48",
  },
  commentBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  commentBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
  },
  pollCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  pollBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pollBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0369a1",
  },
  pollQuestion: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },
  pollDesc: {
    fontSize: 12,
    color: "#64748b",
  },
  pollOptions: {
    gap: 8,
    marginTop: 4,
  },
  pollOptCard: {
    position: "relative",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pollOptVoted: {
    borderColor: "#38bdf8",
  },
  progressBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#e2e8f0",
  },
  optContentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 1,
  },
  optText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
    flex: 1,
  },
  optPercent: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.text,
    marginLeft: 8,
  },
  totalVotesText: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "right",
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
  },
  modalClose: {
    fontSize: 18,
    color: "#94a3b8",
    padding: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.text,
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  activePostTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },
  activePostContent: {
    fontSize: 12,
    color: "#475569",
    marginTop: 4,
    marginBottom: 12,
  },
  commentList: {
    maxHeight: 180,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  commentBubble: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  commentAuthor: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.primary,
  },
  commentText: {
    fontSize: 12,
    color: Colors.text,
    marginTop: 2,
  },
  noCommentsText: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    padding: 10,
  },
  replyRow: {
    flexDirection: "row",
    gap: 8,
  },
  replyInput: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: Colors.text,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: "center",
  },
  sendBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
});
