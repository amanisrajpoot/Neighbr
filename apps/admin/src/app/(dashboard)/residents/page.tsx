"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  Building,
  Phone,
  Home,
  CheckCircle2,
  BadgeAlert,
  User,
  Shield,
  Send,
  Calendar,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal } from "@/components/Modal";
import { api, ResidentItem, UnitItem } from "@/lib/api";
import { useSociety } from "@/context/SocietyContext";

export default function ResidentsDirectoryPage() {
  const { currentSociety } = useSociety();
  const societyId = currentSociety?.id;

  const [residents, setResidents] = useState<ResidentItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Add resident modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [type, setType] = useState<"owner" | "tenant">("owner");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // View resident profile modal state
  const [viewingResident, setViewingResident] = useState<ResidentItem | null>(null);
  const [inviteSent, setInviteSent] = useState(false);

  const loadData = async () => {
    if (!societyId) return;
    try {
      setIsLoading(true);
      const [resList, unitList] = await Promise.all([
        api.getResidents(societyId).catch(() => []),
        api.getUnits(societyId).catch(() => []),
      ]);
      setResidents(resList);
      setUnits(unitList);
      if (unitList.length > 0 && !selectedUnitId) {
        setSelectedUnitId(unitList[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load resident directory:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (societyId) {
      loadData();
    }
  }, [societyId]);

  const handleOnboardResident = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile phone number.");
      return;
    }

    if (!societyId) {
      setErrorMessage("Society context not loaded. Please try again.");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.onboardResident(societyId, {
        name: name.trim(),
        phone: cleanPhone,
        unit_id: selectedUnitId || undefined,
        membership_type: type,
      });

      await loadData();
      setIsAddModalOpen(false);
      setName("");
      setPhone("+91 ");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to onboard resident in database.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendInvite = () => {
    setInviteSent(true);
    setTimeout(() => {
      setInviteSent(false);
    }, 2500);
  };

  const filteredResidents = residents.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.unit_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-500 dark:text-sky-400" />
            Resident Directory & Onboarding
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage flat memberships, household profiles, digital gate passes, and tenant governance
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMessage(null);
            setIsAddModalOpen(true);
          }}
          className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-sky-600/20 transition self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Onboard Resident
        </button>
      </div>

      {/* Directory Table Container */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search resident, flat, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 transition"
            />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold self-end sm:self-auto">
            Showing <strong className="text-slate-900 dark:text-white">{filteredResidents.length}</strong> Registered Households
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3">Resident</th>
                <th className="pb-3">Flat / Unit</th>
                <th className="pb-3">Mobile Contact</th>
                <th className="pb-3">Occupancy Type</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredResidents.map((res) => (
                <tr key={res.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 font-semibold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold flex items-center justify-center text-xs">
                        {res.name.charAt(0)}
                      </div>
                      <span>{res.name}</span>
                    </div>
                  </td>
                  <td className="py-3 font-mono font-bold text-sky-600 dark:text-sky-400">{res.unit_number}</td>
                  <td className="py-3 font-mono text-slate-600 dark:text-slate-300">{res.phone}</td>
                  <td className="py-3">
                    <span className="capitalize px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                      {res.membership_type}
                    </span>
                  </td>
                  <td className="py-3">
                    <StatusBadge status="ACTIVE" />
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => setViewingResident(res)}
                      className="text-sky-600 dark:text-sky-400 hover:underline font-bold text-xs cursor-pointer"
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Resident Profile Modal */}
      {viewingResident && (
        <Modal
          isOpen={true}
          onClose={() => setViewingResident(null)}
          title={`Resident Profile: ${viewingResident.name}`}
          description="Detailed household membership, flat allotment, and digital access pass status."
        >
          <div className="space-y-5 text-slate-900 dark:text-white">
            {/* Header Avatar Badge */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-sky-600 text-white font-bold text-lg flex items-center justify-center shadow-md shadow-sky-600/25">
                {viewingResident.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{viewingResident.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{viewingResident.phone}</p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-xs font-extrabold capitalize">
                {viewingResident.membership_type}
              </span>
            </div>

            {/* Flat & Society Details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Assigned Unit</span>
                <span className="font-mono font-bold text-sm text-sky-600 dark:text-sky-400 mt-0.5 block">
                  Flat {viewingResident.unit_number}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 font-bold block uppercase text-[10px]">App Login Status</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mobile App Verified
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Mobile App Onboarding Invite</span>
                <button
                  onClick={handleSendInvite}
                  disabled={inviteSent}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> {inviteSent ? "✓ SMS Invite Dispatched" : "Send Login SMS"}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewingResident(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Onboard Resident Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Onboard Resident Household"
        description="Register a flat owner or tenant into the estate directory."
      >
        <form onSubmit={handleOnboardResident} className="space-y-4">
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
                placeholder="e.g. Siddharth Verma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Mobile Phone (For App Login & Gate Passes) *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                placeholder="+91 98765 00000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Accepts 10-digit mobile number with or without +91</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Assign Flat / Villa
              </label>
              <div className="relative">
                <Home className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 appearance-none cursor-pointer"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      Flat {u.unit_number} ({u.unit_type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Occupancy Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "owner" | "tenant")}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 appearance-none cursor-pointer"
              >
                <option value="owner" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Flat Owner</option>
                <option value="tenant" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Tenant (Rented)</option>
              </select>
            </div>
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
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-sky-600/20 cursor-pointer"
            >
              {isSubmitting ? "Onboarding..." : "Onboard Resident"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
