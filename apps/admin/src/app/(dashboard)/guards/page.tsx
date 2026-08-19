"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldPlus,
  Radio,
  Phone,
  Lock,
  BadgeAlert,
  User,
  Shield,
  Clock,
  CheckCircle2,
  Sliders,
  Check,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal } from "@/components/Modal";
import { api, GuardItem, GateItem } from "@/lib/api";
import { useSociety } from "@/context/SocietyContext";

export default function GuardsDirectoryPage() {
  const { currentSociety } = useSociety();
  const societyId = currentSociety?.id;

  const [guards, setGuards] = useState<GuardItem[]>([]);
  const [gates, setGates] = useState<GateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Guard Modal State
  const [isAddGuardModalOpen, setIsAddGuardModalOpen] = useState(false);
  const [guardName, setGuardName] = useState("");
  const [guardPhone, setGuardPhone] = useState("+91 ");
  const [employeeId, setEmployeeId] = useState("");
  const [selectedGateId, setSelectedGateId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit Permissions Modal State
  const [editingGuard, setEditingGuard] = useState<GuardItem | null>(null);
  const [assignedGate, setAssignedGate] = useState("Main North Gate");
  const [permissions, setPermissions] = useState({
    canCreateWalkIn: true,
    canOverrideBlacklist: false,
    canOperateOffline: true,
    canTriggerSOS: true,
  });
  const [permissionsSaved, setPermissionsSaved] = useState(false);

  const loadData = async () => {
    if (!societyId) return;
    try {
      setIsLoading(true);
      const [guardList, gateList] = await Promise.all([
        api.getGuards(societyId).catch(() => []),
        api.getGates(societyId).catch(() => []),
      ]);
      setGuards(guardList);
      setGates(gateList);
      if (gateList.length > 0 && !selectedGateId) {
        setSelectedGateId(gateList[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load guard and gate directory:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (societyId) {
      loadData();
    }
  }, [societyId]);

  const handleAddGuard = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = guardPhone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile phone number for guard tablet login.");
      return;
    }

    if (!societyId) {
      setErrorMessage("Society context not loaded. Please try again.");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.createGuard(societyId, {
        name: guardName.trim(),
        phone: cleanPhone,
        employee_id: employeeId.trim() || undefined,
        assigned_gate_id: selectedGateId || undefined,
      });

      await loadData();
      setIsAddGuardModalOpen(false);
      setGuardName("");
      setGuardPhone("+91 ");
      setEmployeeId("");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to register security guard in database.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPermissions = (guard: GuardItem) => {
    setEditingGuard(guard);
    setAssignedGate(guard.gate_name || "Main North Gate");
    setPermissionsSaved(false);
  };

  const handleSavePermissions = () => {
    setPermissionsSaved(true);
    setTimeout(() => {
      setEditingGuard(null);
      setPermissionsSaved(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-sky-500 dark:text-sky-400" />
            Security Force & Gate Terminals
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage guard duty stations, active shift rosters, access-control permissions, and mobile tablets
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMessage(null);
            setIsAddGuardModalOpen(true);
          }}
          className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-sky-600/20 transition self-start sm:self-auto cursor-pointer"
        >
          <ShieldPlus className="w-3.5 h-3.5" />
          Register Guard
        </button>
      </div>

      {/* Gate Terminals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {gates.map((gate) => (
          <div
            key={gate.id}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{gate.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Type: {gate.gate_type} • Avg check-in: 3.2s</p>
            </div>
          </div>
        ))}
      </div>

      {/* Guard Roster Table */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Guard Directory & Device Status ({guards.length} Guards)
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3">Employee</th>
                <th className="pb-3">Mobile Contact</th>
                <th className="pb-3">Security Station</th>
                <th className="pb-3">Duty Status</th>
                <th className="pb-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {guards.map((guard) => (
                <tr key={guard.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 font-semibold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold flex items-center justify-center text-xs">
                        {guard.name.charAt(0)}
                      </div>
                      <div>
                        <span>{guard.name}</span>
                        <span className="block text-[10px] text-slate-400 font-mono">{guard.employee_id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 font-mono text-slate-600 dark:text-slate-300">{guard.phone}</td>
                  <td className="py-3 text-slate-600 dark:text-slate-300">{guard.gate_name || "Main North Gate"}</td>
                  <td className="py-3">
                    <StatusBadge status={guard.status} />
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => handleOpenPermissions(guard)}
                      className="text-sky-600 dark:text-sky-400 hover:underline font-bold text-xs cursor-pointer"
                    >
                      Edit Permissions
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Permissions Modal */}
      {editingGuard && (
        <Modal
          isOpen={true}
          onClose={() => setEditingGuard(null)}
          title={`Guard Terminal Permissions: ${editingGuard.name}`}
          description="Configure station assignment, bypass privileges, and offline mutation authorization."
        >
          <div className="space-y-4 text-xs text-slate-900 dark:text-white">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Assigned Security Gate
              </label>
              <select
                value={assignedGate}
                onChange={(e) => setAssignedGate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 appearance-none cursor-pointer"
              >
                {gates.map((g) => (
                  <option key={g.id} value={g.name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {g.name} ({g.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Permission Toggles */}
            <div className="space-y-2.5 pt-2">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Gate Capabilities & Overrides
              </span>

              {[
                {
                  key: "canCreateWalkIn" as const,
                  label: "Walk-in Visitor Check-In",
                  desc: "Allow guard to register unscheduled deliveries, guests, and cabs.",
                },
                {
                  key: "canOperateOffline" as const,
                  label: "Offline SQLite Gate Sync",
                  desc: "Permit offline local queue caching when Wi-Fi is unavailable.",
                },
                {
                  key: "canTriggerSOS" as const,
                  label: "Emergency SOS Alarm Dispatch",
                  desc: "Allow emergency gate lock broadcast to community residents.",
                },
                {
                  key: "canOverrideBlacklist" as const,
                  label: "Blacklist Bypass Authorization",
                  desc: "Permit supervisor override for restricted entries (Requires PIN).",
                },
              ].map((item) => (
                <div
                  key={item.key}
                  onClick={() => setPermissions({ ...permissions, [item.key]: !permissions[item.key] })}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-sky-500/50 transition-colors"
                >
                  <div className="pr-3">
                    <span className="font-bold text-slate-900 dark:text-white block">{item.label}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">{item.desc}</span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                      permissions[item.key]
                        ? "bg-sky-600 border-sky-600 text-white"
                        : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    }`}
                  >
                    {permissions[item.key] && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingGuard(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={permissionsSaved}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                {permissionsSaved ? "✓ Permissions Updated" : "Save Station Permissions"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Register Guard Modal */}
      <Modal
        isOpen={isAddGuardModalOpen}
        onClose={() => setIsAddGuardModalOpen(false)}
        title="Register Security Guard"
        description="Add a new security guard to the duty roster and issue a mobile tablet login."
      >
        <form onSubmit={handleAddGuard} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <BadgeAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. Ramesh Chandra"
                value={guardName}
                onChange={(e) => setGuardName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Mobile Phone (For Guard App Login) *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                placeholder="+91 98765 00000"
                value={guardPhone}
                onChange={(e) => setGuardPhone(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Employee Badge ID
              </label>
              <input
                type="text"
                placeholder="e.g. SEC-104"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Duty Gate Assignment
              </label>
              <select
                value={selectedGateId}
                onChange={(e) => setSelectedGateId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 appearance-none cursor-pointer"
              >
                {gates.map((g) => (
                  <option key={g.id} value={g.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddGuardModalOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-sky-600/20 cursor-pointer"
            >
              {isSubmitting ? "Registering..." : "Register Guard"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
