"use client";

import React, { useState, useEffect } from "react";
import {
  Trophy,
  Plus,
  Search,
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  Ban,
  CheckCircle2,
  BadgeAlert,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/StatusBadge";
import { api, AmenityAdminItem, AmenityBookingAdminItem } from "@/lib/api";
import { useSociety } from "@/context/SocietyContext";

export default function AmenitiesAdminPage() {
  const { currentSociety } = useSociety();
  const societyId = currentSociety?.id;

  const [amenities, setAmenities] = useState<AmenityAdminItem[]>([]);
  const [bookings, setBookings] = useState<AmenityBookingAdminItem[]>([]);
  const [activeTab, setActiveTab] = useState<"facilities" | "bookings">("facilities");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Amenity Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("sports");
  const [capacity, setCapacity] = useState("4");
  const [duration, setDuration] = useState("60");
  const [openTime, setOpenTime] = useState("06:00");
  const [closeTime, setCloseTime] = useState("22:00");
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState("0");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    if (!societyId) return;
    try {
      const [aList, bList] = await Promise.all([
        api.getAmenities(societyId).catch(() => []),
        api.getAmenityBookings(societyId).catch(() => []),
      ]);
      setAmenities(aList);
      setBookings(bList);
    } catch (err) {
      console.warn("Failed to load amenities data:", err);
    }
  };

  useEffect(() => {
    if (societyId) {
      loadData();
    }
  }, [societyId]);

  const handleCreateAmenity = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!name.trim() || !code.trim()) {
      setErrorMessage("Please fill all required facility fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.createAmenity(societyId!, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        category,
        capacity_per_slot: parseInt(capacity) || 4,
        slot_duration_minutes: parseInt(duration) || 60,
        open_time: openTime,
        close_time: closeTime,
        is_paid: isPaid,
        price_per_slot: parseFloat(price) || 0,
      });
      await loadData();
      setIsAddModalOpen(false);
      setName("");
      setCode("");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create facility in database.");
      setIsAddModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Cancel resident reservation and release facility slot?")) return;
    try {
      await api.cancelAmenityBooking(societyId!, bookingId);
      await loadData();
    } catch (e) {
      setBookings(
        bookings.map((b) => (b.id === bookingId ? { ...b, status: "CANCELLED" } : b))
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-sky-500 dark:text-sky-400" />
            Clubhouse Facilities & Slot Bookings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure amenities, manage time slots, and monitor resident facility reservations
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
          Add Facility
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("facilities")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "facilities"
              ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Active Facilities ({amenities.length})
        </button>
        <button
          onClick={() => setActiveTab("bookings")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "bookings"
              ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Reservation Log ({bookings.length})
        </button>
      </div>

      {/* Content Section */}
      {activeTab === "facilities" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {amenities.map((amn) => (
            <div
              key={amn.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                    {amn.code}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 capitalize">
                    {amn.category}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{amn.name}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {amn.description || "Clubhouse facility available for resident reservations."}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>Operating Hours:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{amn.open_time} - {amn.close_time}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>Capacity / Duration:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {amn.capacity_per_slot} players • {amn.slot_duration_minutes}m
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>Charge:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {amn.is_paid ? `₹${amn.price_per_slot} / slot` : "Complimentary"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Facility Name</th>
                  <th className="pb-3">Resident / Flat</th>
                  <th className="pb-3">Date & Time Slot</th>
                  <th className="pb-3">Spots</th>
                  <th className="pb-3">Pass Code</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-bold text-slate-900 dark:text-white">{b.amenity_name}</td>
                    <td className="py-3 font-semibold text-slate-900 dark:text-white">
                      {b.user_name}
                      <span className="block font-mono text-[10px] text-sky-600 dark:text-sky-400 font-normal">{b.unit_number}</span>
                    </td>
                    <td className="py-3 text-slate-700 dark:text-slate-300">
                      📅 {b.booking_date} • ⏰ {b.start_time} - {b.end_time}
                    </td>
                    <td className="py-3 font-bold">{b.guest_count}</td>
                    <td className="py-3 font-mono font-bold text-sky-600 dark:text-sky-400">{b.qr_pass}</td>
                    <td className="py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="py-3 text-right">
                      {b.status === "CONFIRMED" && (
                        <button
                          onClick={() => handleCancelBooking(b.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-bold cursor-pointer"
                        >
                          Cancel Slot
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Amenity Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Clubhouse Facility"
        description="Register a sports court, swimming pool, or hall for resident time slot bookings."
      >
        <form onSubmit={handleCreateAmenity} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <BadgeAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Facility Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Squash Court #1 or Rooftop BBQ Lawn"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Facility Code *
              </label>
              <input
                type="text"
                placeholder="e.g. SQUASH-1"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 appearance-none cursor-pointer"
              >
                <option value="sports" className="bg-white dark:bg-slate-900">Sports & Courts</option>
                <option value="wellness" className="bg-white dark:bg-slate-900">Pool & Wellness</option>
                <option value="events" className="bg-white dark:bg-slate-900">Banquet & Events</option>
                <option value="leisure" className="bg-white dark:bg-slate-900">Leisure & Games</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Max Players / Slot
              </label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Slot Duration (Mins)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              />
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
              {isSubmitting ? "Saving..." : "Create Facility"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
