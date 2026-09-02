"use client";

import React, { useState, useEffect } from "react";
import {
  Wrench,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  MessageSquare,
  Star,
  Plus,
  BadgeAlert,
  Send,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/StatusBadge";
import { api, HelpdeskTicketItem } from "@/lib/api";
import { useSociety } from "@/context/SocietyContext";

export default function HelpdeskAdminPage() {
  const { currentSociety } = useSociety();
  const societyId = currentSociety?.id;

  const [tickets, setTickets] = useState<HelpdeskTicketItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Status / Assign Modal
  const [selectedTicket, setSelectedTicket] = useState<HelpdeskTicketItem | null>(null);
  const [newStatus, setNewStatus] = useState("IN_PROGRESS");
  const [assigneeName, setAssigneeName] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    if (!societyId) return;
    try {
      setIsLoading(true);
      const list = await api.getHelpdeskTickets(societyId).catch(() => []);
      setTickets(list);
    } catch (err) {
      console.warn("Failed to load helpdesk tickets:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (societyId) {
      loadData();
    }
  }, [societyId]);

  const handleUpdateTicket = async () => {
    if (!selectedTicket || !societyId) return;
    try {
      setIsSubmitting(true);
      await api.updateTicketStatus(societyId, selectedTicket.id, {
        status: newStatus,
        resolution_notes: resolutionNotes || undefined,
      });
      if (commentText.trim()) {
        await api.addTicketComment(societyId, selectedTicket.id, {
          message: commentText.trim(),
          is_internal: false,
        });
      }
      await loadData();
      setSelectedTicket(null);
      setCommentText("");
      setResolutionNotes("");
    } catch (e: any) {
      alert("Failed to update ticket.");
      setSelectedTicket(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesFilter = activeFilter === "ALL" || t.status === activeFilter;
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.unit_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.creator_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getCategoryBadge = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "plumbing":
        return <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-bold">🚰 PLUMBING</span>;
      case "electrical":
        return <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-mono text-[10px] font-bold">⚡ ELECTRICAL</span>;
      case "lift":
        return <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-mono text-[10px] font-bold">🛗 LIFT</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold">🔧 {cat.toUpperCase()}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench className="w-6 h-6 text-sky-500 dark:text-sky-400" />
            Resident Helpdesk & Service Tickets
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Dispatch maintenance technicians, monitor SLA deadlines, and track resident repair ratings
          </p>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Tickets</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{tickets.length}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-1">
          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Open / Pending</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {tickets.filter((t) => t.status === "OPEN" || t.status === "ASSIGNED").length}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-1">
          <div className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">In Progress</div>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400">
            {tickets.filter((t) => t.status === "IN_PROGRESS").length}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-1">
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Resolved</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {tickets.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED").length}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED"].map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeFilter === f
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {f === "ALL" ? "All Tickets" : f.replace("_", " ")} ({tickets.filter((t) => f === "ALL" || t.status === f).length})
          </button>
        ))}
      </div>

      {/* Content Table */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ticket title, flat, resident, service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3">Ticket ID & Subject</th>
                <th className="pb-3">Flat / Unit</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Assigned Staff</th>
                <th className="pb-3">SLA Target</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredTickets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 pr-3 font-semibold text-slate-900 dark:text-white max-w-xs">
                    <div className="font-bold truncate">{t.title}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate mt-0.5">
                      {t.description}
                    </div>
                  </td>
                  <td className="py-3 font-mono font-bold text-sky-600 dark:text-sky-400">
                    {t.unit_number || "General"}
                    <span className="block text-[10px] text-slate-400 font-normal">{t.creator_name}</span>
                  </td>
                  <td className="py-3">{getCategoryBadge(t.category)}</td>
                  <td className="py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="py-3 text-slate-700 dark:text-slate-300">
                    {t.assignee_name ? (
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                        {t.assignee_name}
                      </span>
                    ) : (
                      <span className="text-amber-500 font-medium text-[11px]">⏳ Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                    {t.sla_due_at || "24 hrs"}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedTicket(t);
                        setNewStatus(t.status);
                        setResolutionNotes(t.resolution_notes || "");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-bold cursor-pointer"
                    >
                      Manage & Dispatch
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Manage & Dispatch Modal */}
      {selectedTicket && (
        <Modal
          isOpen={Boolean(selectedTicket)}
          onClose={() => setSelectedTicket(null)}
          title={`Manage Ticket: ${selectedTicket.title}`}
          description={`Reported by ${selectedTicket.creator_name} for Flat ${selectedTicket.unit_number}`}
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Problem Description:</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {selectedTicket.description}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Ticket Status Workflow
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 appearance-none cursor-pointer"
              >
                <option value="OPEN" className="bg-white dark:bg-slate-900">OPEN (Awaiting Technician)</option>
                <option value="ASSIGNED" className="bg-white dark:bg-slate-900">ASSIGNED (Work Order Created)</option>
                <option value="IN_PROGRESS" className="bg-white dark:bg-slate-900">IN_PROGRESS (Technician on Site)</option>
                <option value="RESOLVED" className="bg-white dark:bg-slate-900">RESOLVED (Completed & Awaiting Rating)</option>
                <option value="CLOSED" className="bg-white dark:bg-slate-900">CLOSED</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Resolution Notes / Technician Log
              </label>
              <textarea
                rows={2}
                placeholder="Explain the fix, replaced parts, or visit schedule..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Send Note to Resident App
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Electrician Ramesh will visit flat at 4:30 PM..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleUpdateTicket}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-sky-600/20 cursor-pointer"
              >
                {isSubmitting ? "Updating..." : "Save & Notify Resident"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
