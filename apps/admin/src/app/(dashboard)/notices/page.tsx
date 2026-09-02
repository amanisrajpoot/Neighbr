"use client";

import React, { useState, useEffect } from "react";
import { Bell, Plus, Send, AlertTriangle, Info, Wrench, BadgeAlert } from "lucide-react";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/StatusBadge";
import { api, NoticeItem } from "@/lib/api";
import { useSociety } from "@/context/SocietyContext";

export default function NoticesPage() {
  const { currentSociety } = useSociety();
  const societyId = currentSociety?.id;

  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [sendPush, setSendPush] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    if (!societyId) return;
    try {
      setIsLoading(true);
      const list = await api.getNotices(societyId).catch(() => []);
      setNotices(list);
    } catch (err) {
      console.warn("Failed to load notices:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (societyId) {
      loadData();
    }
  }, [societyId]);

  const handleCreateNotice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (title.trim().length < 3) {
      setErrorMessage("Please enter a notice title (minimum 3 characters).");
      return;
    }

    if (body.trim().length < 5) {
      setErrorMessage("Please provide complete notice details/announcement text.");
      return;
    }

    if (!societyId) {
      setErrorMessage("Society context not loaded. Please try again.");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.createNotice(societyId, {
        title: title.trim(),
        body: body.trim(),
        category,
        priority,
        send_push: sendPush,
      });
      await loadData();
      setIsAddModalOpen(false);
      setTitle("");
      setBody("");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to publish notice to database.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "emergency":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "maintenance":
        return <Wrench className="w-4 h-4 text-amber-500" />;
      default:
        return <Info className="w-4 h-4 text-sky-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-sky-500 dark:text-sky-400" />
            Digital Notice Board & Broadcasts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Publish official announcements, maintenance schedules, and broadcast mobile push alerts
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMessage(null);
            setIsAddModalOpen(true);
          }}
          className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-sky-600/20 transition self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Broadcast New Notice
        </button>
      </div>

      {/* Notices Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notices.map((notice) => (
          <div
            key={notice.id}
            className={`p-5 rounded-2xl border transition-all flex flex-col justify-between shadow-sm ${
              notice.priority === "urgent"
                ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-500/30"
                : notice.priority === "high"
                ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-500/30"
                : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {getCategoryIcon(notice.category)}
                  <span>{notice.category}</span>
                </div>
                <StatusBadge status={notice.priority} />
              </div>

              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">{notice.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-4 leading-relaxed">{notice.body}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>Published: {notice.created_at?.slice(0, 10) || "Recent"}</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">● Sent via Push</span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Notice Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Broadcast Society Notice"
        description="This announcement will be published to the mobile notice board and dispatched via push notifications."
      >
        <form onSubmit={handleCreateNotice} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <BadgeAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Notice Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Scheduled Lift Maintenance & Power Shutdown"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 appearance-none cursor-pointer"
              >
                <option value="general" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">General Information</option>
                <option value="maintenance" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Maintenance / Utility</option>
                <option value="event" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Community Event / Festival</option>
                <option value="emergency" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Urgent / Safety Alert</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 appearance-none cursor-pointer"
              >
                <option value="normal" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Normal</option>
                <option value="high" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">High Priority</option>
                <option value="urgent" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Urgent (Emergency Banner)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Notice Content *
            </label>
            <textarea
              rows={4}
              placeholder="Describe the announcement, timings, affected towers, and contact persons..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 resize-none"
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="sendPush"
              checked={sendPush}
              onChange={(e) => setSendPush(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-sky-600 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="sendPush" className="text-xs text-slate-700 dark:text-slate-300 select-none cursor-pointer font-medium">
              Send instant high-priority push notification to all resident mobile apps
            </label>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-sky-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? "Publishing..." : "Broadcast Notice"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
