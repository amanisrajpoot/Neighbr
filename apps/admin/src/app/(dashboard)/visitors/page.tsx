"use client";

import React, { useState, useEffect } from "react";
import { UserCheck, ShieldAlert, Search, Phone, Car, UserX, AlertCircle, BadgeAlert } from "lucide-react";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/StatusBadge";
import { api, VisitorPassItem, BlacklistItem } from "@/lib/api";
import { useSociety } from "@/context/SocietyContext";

export default function VisitorsPage() {
  const { currentSociety } = useSociety();
  const societyId = currentSociety?.id;

  const [passes, setPasses] = useState<VisitorPassItem[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistItem[]>([]);
  const [activeTab, setActiveTab] = useState<"passes" | "blacklist">("passes");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddBlacklistOpen, setIsAddBlacklistOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [blackType, setBlackType] = useState<"phone" | "vehicle" | "person">("phone");
  const [blackValue, setBlackValue] = useState("");
  const [blackReason, setBlackReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    if (!societyId) return;
    try {
      setIsLoading(true);
      const [passList, blackList] = await Promise.all([
        api.getVisitorPasses(societyId).catch(() => []),
        api.getBlacklist(societyId).catch(() => []),
      ]);

      setPasses(passList);
      setBlacklist(blackList);
    } catch (err) {
      console.warn("Failed to load visitor data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (societyId) {
      loadData();
    }
  }, [societyId]);

  const handleAddBlacklist = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!blackValue.trim()) {
      setErrorMessage("Please specify the phone number, vehicle plate, or name to blacklist.");
      return;
    }

    if (blackReason.trim().length < 3) {
      setErrorMessage("Please provide a reason for the blacklist entry.");
      return;
    }

    if (!societyId) {
      setErrorMessage("Society context not loaded. Please try again.");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.addToBlacklist(societyId, {
        entity_type: blackType,
        entity_value: blackValue.trim(),
        reason: blackReason.trim(),
      });
      await loadData();
      setIsAddBlacklistOpen(false);
      setBlackValue("");
      setBlackReason("");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to add entity to security blacklist.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPasses = passes.filter(
    (p) =>
      p.visitor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.unit_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.vehicle_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBlacklist = blacklist.filter(
    (b) =>
      b.entity_value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.reason.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-sky-500 dark:text-sky-400" />
            Visitor Logs & Security Watchlist
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time audit log of all guest, delivery, cab passes, and restricted entities
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              setErrorMessage(null);
              setIsAddBlacklistOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Add to Blacklist
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("passes")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "passes"
              ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Live Gate Passes ({passes.length})
        </button>
        <button
          onClick={() => setActiveTab("blacklist")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "blacklist"
              ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Restricted Security Blacklist ({blacklist.length})
        </button>
      </div>

      {/* Content Section */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                activeTab === "passes"
                  ? "Search by visitor name, flat, vehicle..."
                  : "Search restricted phone or vehicle plate..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {activeTab === "passes" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Visitor Name</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Destination Unit</th>
                  <th className="pb-3">Vehicle</th>
                  <th className="pb-3">Pass Status</th>
                  <th className="pb-3">Validity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredPasses.map((pass) => (
                  <tr key={pass.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs">
                          {pass.visitor_name.charAt(0)}
                        </div>
                        <span>{pass.visitor_name}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="uppercase text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                        {pass.pass_type}
                      </span>
                    </td>
                    <td className="py-3 font-mono font-bold text-sky-600 dark:text-sky-400">{pass.unit_number || "Gate"}</td>
                    <td className="py-3 font-mono text-slate-600 dark:text-slate-400">{pass.vehicle_number || "Pedestrian"}</td>
                    <td className="py-3">
                      <StatusBadge status={pass.status} />
                    </td>
                    <td className="py-3 text-slate-500 dark:text-slate-400">{pass.valid_until}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Restricted Entity</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Reason for Security Block</th>
                  <th className="pb-3">Enforcement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredBlacklist.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-mono font-bold text-rose-600 dark:text-rose-400">{entry.entity_value}</td>
                    <td className="py-3">
                      <span className="uppercase text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold">
                        {entry.entity_type}
                      </span>
                    </td>
                    <td className="py-3 text-slate-700 dark:text-slate-300">{entry.reason}</td>
                    <td className="py-3">
                      <span className="text-rose-600 dark:text-rose-400 font-bold text-[11px] flex items-center gap-1">
                        ● Strict Entry Denial
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Blacklist Modal */}
      <Modal
        isOpen={isAddBlacklistOpen}
        onClose={() => setIsAddBlacklistOpen(false)}
        title="Restrict Suspicious Entity"
        description="Gate guards will be automatically alerted and entry strictly denied when scanned."
      >
        <form onSubmit={handleAddBlacklist} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <BadgeAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Entity Type
            </label>
            <select
              value={blackType}
              onChange={(e) => setBlackType(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 appearance-none cursor-pointer"
            >
              <option value="phone" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Mobile Phone Number</option>
              <option value="vehicle" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Vehicle License Plate</option>
              <option value="person" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Individual Name / Document</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Identifier (Phone / Plate / Name) *
            </label>
            <input
              type="text"
              placeholder="e.g. +91 98765 99999 or DL03XY9999"
              value={blackValue}
              onChange={(e) => setBlackValue(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Security Reason / Incident Details *
            </label>
            <textarea
              rows={3}
              placeholder="Explain the security violation, unauthorized soliciting, or trespassing incident..."
              value={blackReason}
              onChange={(e) => setBlackReason(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 resize-none"
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddBlacklistOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-rose-600/20 cursor-pointer"
            >
              {isSubmitting ? "Enforcing Block..." : "Enforce Security Blacklist"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
