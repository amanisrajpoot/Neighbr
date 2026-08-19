"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Plus,
  Search,
  CheckCircle2,
  ThumbsUp,
  BarChart3,
  Pin,
  Trash2,
  Vote,
  Sparkles,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { api, CommunityPostAdminItem, CommunityPollAdminItem } from "@/lib/api";
import { useSociety } from "@/context/SocietyContext";

const SAMPLE_POSTS: CommunityPostAdminItem[] = [
  {
    id: "p-1",
    author_name: "Pooja Verma",
    unit_number: "Villa-42",
    title: "Ganesh Chaturthi Cultural Night Organizing Committee",
    content: "We are forming a resident volunteer group for stage setup, kids dance rehearsals, and prasad distribution for the upcoming festival.",
    category: "events",
    likes_count: 14,
    is_pinned: true,
    created_at: "2026-08-19T08:00:00Z",
  },
  {
    id: "p-2",
    author_name: "Dr. Ananya Roy",
    unit_number: "B-204",
    title: "Recommended Pediatrician near Main Gate",
    content: "Can anyone recommend a good child clinic or pediatrician within 2-3 kms of our society north gate?",
    category: "recommendations",
    likes_count: 6,
    is_pinned: false,
    created_at: "2026-08-18T16:00:00Z",
  },
];

const SAMPLE_POLLS: CommunityPollAdminItem[] = [
  {
    id: "pl-1",
    author_name: "Society Committee",
    question: "Should we install 4 additional dedicated EV Fast-Charging points in Tower A & B Basement?",
    description: "Estimated capital cost shared via sinking fund with pay-per-unit metering.",
    options: ["Yes, approve installation", "No, keep existing 2 points", "Need more technical details"],
    total_votes: 42,
    stats: [
      { index: 0, text: "Yes, approve installation", vote_count: 32, percentage: 76.2 },
      { index: 1, text: "No, keep existing 2 points", vote_count: 6, percentage: 14.3 },
      { index: 2, text: "Need more technical details", vote_count: 4, percentage: 9.5 },
    ],
    is_active: true,
    created_at: "2026-08-18T10:00:00Z",
  },
];

export default function CommunityAdminPage() {
  const { currentSociety } = useSociety();
  const societyId = currentSociety?.id;

  const [posts, setPosts] = useState<CommunityPostAdminItem[]>([]);
  const [polls, setPolls] = useState<CommunityPollAdminItem[]>([]);
  const [activeTab, setActiveTab] = useState<"posts" | "polls">("posts");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Poll Form State
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollDesc, setPollDesc] = useState("");
  const [optionsStr, setOptionsStr] = useState("Yes, approve\nNo, reject\nNeed more discussion");

  const loadData = async () => {
    if (!societyId) return;
    try {
      const [pList, plList] = await Promise.all([
        api.getCommunityPosts(societyId).catch(() => []),
        api.getCommunityPolls(societyId).catch(() => []),
      ]);
      setPosts(pList.length > 0 ? pList : SAMPLE_POSTS);
      setPolls(plList.length > 0 ? plList : SAMPLE_POLLS);
    } catch (err) {
      console.warn("Failed to load community data:", err);
    }
  };

  useEffect(() => {
    if (societyId) {
      loadData();
    }
  }, [societyId]);

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const opts = optionsStr
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
    if (!pollQuestion.trim() || opts.length < 2) {
      alert("Please provide a question and at least 2 options.");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.createCommunityPoll(societyId!, {
        question: pollQuestion.trim(),
        description: pollDesc.trim() || undefined,
        options: opts,
      });
      await loadData();
      setIsPollModalOpen(false);
      setPollQuestion("");
      setPollDesc("");
    } catch (e) {
      // local fallback
      setPolls([
        {
          id: `pl-${Date.now()}`,
          author_name: "Management Committee",
          question: pollQuestion,
          description: pollDesc,
          options: opts,
          total_votes: 0,
          stats: opts.map((t, idx) => ({ index: idx, text: t, vote_count: 0, percentage: 0 })),
          is_active: true,
          created_at: new Date().toISOString(),
        },
        ...polls,
      ]);
      setIsPollModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-sky-500 dark:text-sky-400" />
            Community Moderation & Resident Polls
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Moderate resident discussions, publish society-wide voting polls, and oversee neighbor engagement
          </p>
        </div>

        <button
          onClick={() => setIsPollModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-sky-600/20 transition cursor-pointer"
        >
          <Vote className="w-3.5 h-3.5" />
          Create Resident Poll
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("posts")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "posts"
              ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Community Feed ({posts.length})
        </button>
        <button
          onClick={() => setActiveTab("polls")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "polls"
              ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Official Society Polls ({polls.length})
        </button>
      </div>

      {activeTab === "posts" ? (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Headline & Topic</th>
                  <th className="pb-3">Author / Flat</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Likes</th>
                  <th className="pb-3">Pinned</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 pr-3 max-w-sm">
                      <div className="font-bold text-slate-900 dark:text-white">{post.title}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {post.content}
                      </div>
                    </td>
                    <td className="py-3 font-semibold text-slate-900 dark:text-white">
                      {post.author_name}
                      <span className="block font-mono text-[10px] text-sky-600 dark:text-sky-400 font-normal">
                        {post.unit_number || "Villa-42"}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300">
                        #{post.category}
                      </span>
                    </td>
                    <td className="py-3 font-bold text-rose-500">❤️ {post.likes_count}</td>
                    <td className="py-3">
                      {post.is_pinned ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px]">
                          📌 Pinned
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Standard</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => {
                          setPosts(
                            posts.map((p) => (p.id === post.id ? { ...p, is_pinned: !p.is_pinned } : p))
                          );
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold mr-2 cursor-pointer"
                      >
                        {post.is_pinned ? "Unpin" : "Pin Post"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {polls.map((poll) => (
            <div
              key={poll.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 font-mono uppercase bg-sky-500/10 px-2 py-0.5 rounded-md">
                    Total Votes: {poll.total_votes}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                    ● ACTIVE POLL
                  </span>
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                  {poll.question}
                </h3>
                {poll.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{poll.description}</p>
                )}
              </div>

              <div className="space-y-2.5 pt-2">
                {poll.stats.map((st) => (
                  <div key={st.index} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>{st.text}</span>
                      <span>
                        {st.vote_count} votes ({st.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-500 rounded-full transition-all duration-500"
                        style={{ width: `${st.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Poll Modal */}
      <Modal
        isOpen={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
        title="Create Official Society Poll"
        description="Launch an interactive voting poll for all verified flat owners & residents."
      >
        <form onSubmit={handleCreatePoll} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Poll Question / Decision *
            </label>
            <input
              type="text"
              placeholder="e.g. Should society gates close at 11:00 PM or 11:30 PM?"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Background Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Provide background context or rationale for voters..."
              value={pollDesc}
              onChange={(e) => setPollDesc(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Voting Options (One per line) *
            </label>
            <textarea
              rows={3}
              value={optionsStr}
              onChange={(e) => setOptionsStr(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 resize-none"
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsPollModalOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-sky-600/20 cursor-pointer"
            >
              {isSubmitting ? "Launching Poll..." : "Publish Poll"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
