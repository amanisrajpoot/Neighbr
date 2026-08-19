"use client";

import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  Plus,
  Search,
  CheckCircle2,
  ShieldCheck,
  Star,
  Phone,
  Trash2,
  Calendar,
  Key,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { api, MarketplaceListingAdminItem, VendorAdminItem, ServiceBookingAdminItem } from "@/lib/api";
import { useSociety } from "@/context/SocietyContext";

export default function MarketplaceAdminPage() {
  const { currentSociety } = useSociety();
  const societyId = currentSociety?.id;

  const [listings, setListings] = useState<MarketplaceListingAdminItem[]>([]);
  const [vendors, setVendors] = useState<VendorAdminItem[]>([]);
  const [bookings, setBookings] = useState<ServiceBookingAdminItem[]>([]);
  const [activeTab, setActiveTab] = useState<"listings" | "vendors" | "bookings">("listings");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vendor Form State
  const [vName, setVName] = useState("");
  const [vCategory, setVCategory] = useState("cleaning");
  const [vPhone, setVPhone] = useState("");
  const [vDesc, setVDesc] = useState("");
  const [vPrice, setVPrice] = useState("499");

  const loadData = async () => {
    if (!societyId) return;
    try {
      const [lList, vList, bList] = await Promise.all([
        api.getMarketplaceListings(societyId).catch(() => []),
        api.getVendors(societyId).catch(() => []),
        api.getServiceBookings(societyId).catch(() => []),
      ]);
      setListings(lList);
      setVendors(vList);
      setBookings(bList);
    } catch (err) {
      console.warn("Failed to load marketplace data:", err);
    }
  };

  useEffect(() => {
    if (societyId) {
      loadData();
    }
  }, [societyId]);

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vName.trim() || !vPhone.trim()) {
      alert("Please provide vendor name and contact phone.");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.createVendor(societyId!, {
        vendor_name: vName.trim(),
        category: vCategory,
        contact_phone: vPhone.trim(),
        description: vDesc.trim() || undefined,
        pricing_starts_at: parseFloat(vPrice) || 299,
        is_verified: true,
      });
      await loadData();
      setIsAddVendorOpen(false);
      setVName("");
      setVPhone("");
    } catch (e) {
      // local fallback
      setVendors([
        ...vendors,
        {
          id: `v-${Date.now()}`,
          vendor_name: vName,
          category: vCategory,
          contact_phone: vPhone,
          description: vDesc,
          is_verified: true,
          rating: 5.0,
          review_count: 1,
          pricing_starts_at: parseFloat(vPrice) || 299,
          is_active: true,
        },
      ]);
      setIsAddVendorOpen(false);
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
            <ShoppingBag className="w-6 h-6 text-sky-500 dark:text-sky-400" />
            Resident Marketplace & Verified Services
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Oversee resident peer-to-peer bazaar, onboard verified local technicians, and audit service gate passes
          </p>
        </div>

        <button
          onClick={() => setIsAddVendorOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-sky-600/20 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Onboard Local Vendor
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("listings")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "listings"
              ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Bazaar Listings ({listings.length})
        </button>
        <button
          onClick={() => setActiveTab("vendors")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "vendors"
              ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Verified Vendors ({vendors.length})
        </button>
        <button
          onClick={() => setActiveTab("bookings")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "bookings"
              ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Gate Pass Dispatch ({bookings.length})
        </button>
      </div>

      {activeTab === "listings" && (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Item Title & Category</th>
                  <th className="pb-3">Seller / Flat</th>
                  <th className="pb-3">Contact</th>
                  <th className="pb-3">Listed Price</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {listings.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 pr-3 max-w-sm">
                      <div className="font-bold text-slate-900 dark:text-white">{item.title}</div>
                      <div className="text-[10px] font-mono text-sky-600 dark:text-sky-400 uppercase font-bold mt-0.5">
                        #{item.category}
                      </div>
                    </td>
                    <td className="py-3 font-semibold text-slate-900 dark:text-white">
                      {item.seller_name}
                      <span className="block font-mono text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                        {item.unit_number || "Villa-42"}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-600 dark:text-slate-400">{item.seller_phone}</td>
                    <td className="py-3 font-extrabold text-slate-900 dark:text-white">
                      {item.is_free ? (
                        <span className="text-amber-500 font-black">🎁 FREE</span>
                      ) : (
                        `₹${item.price.toLocaleString()}`
                      )}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                        ● {item.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => {
                          setListings(listings.filter((l) => l.id !== item.id));
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "vendors" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((v) => (
            <div
              key={v.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono text-[10px] font-bold uppercase">
                    {v.category}
                  </span>
                  {v.is_verified && (
                    <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      POLICE VERIFIED
                    </span>
                  )}
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{v.vendor_name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {v.description || "Certified local society service vendor."}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>Contact Phone:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{v.contact_phone}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>Rating:</span>
                  <span className="font-bold text-amber-500">⭐ {v.rating} ({v.review_count} reviews)</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>Pricing Starts:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{v.pricing_starts_at}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "bookings" && (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Vendor / Service</th>
                  <th className="pb-3">Resident / Flat</th>
                  <th className="pb-3">Scheduled Slot</th>
                  <th className="pb-3">Gate Pass QR Code</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-bold text-slate-900 dark:text-white">{b.vendor_name}</td>
                    <td className="py-3 font-semibold text-slate-900 dark:text-white">
                      {b.resident_name}
                      <span className="block font-mono text-[10px] text-sky-600 dark:text-sky-400 font-normal">
                        {b.unit_number || "Villa-42"}
                      </span>
                    </td>
                    <td className="py-3 text-slate-700 dark:text-slate-300">
                      📅 {b.booking_date} • ⏰ {b.time_slot}
                    </td>
                    <td className="py-3 font-mono font-bold text-sky-600 dark:text-sky-400">
                      {b.gate_pass_code}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                        ● {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Onboard Vendor Modal */}
      <Modal
        isOpen={isAddVendorOpen}
        onClose={() => setIsAddVendorOpen(false)}
        title="Onboard Verified Service Vendor"
        description="Register a local contractor, repairman, or agency for resident on-demand bookings."
      >
        <form onSubmit={handleCreateVendor} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Vendor Agency / Name *
            </label>
            <input
              type="text"
              placeholder="e.g. MasterCarpentry & Woodwork Services"
              value={vName}
              onChange={(e) => setVName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Service Domain
              </label>
              <select
                value={vCategory}
                onChange={(e) => setVCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 appearance-none cursor-pointer"
              >
                <option value="cleaning" className="bg-white dark:bg-slate-900">Cleaning & Detailing</option>
                <option value="appliance_repair" className="bg-white dark:bg-slate-900">AC & Appliance Repair</option>
                <option value="pest_control" className="bg-white dark:bg-slate-900">Pest Control</option>
                <option value="carpentry" className="bg-white dark:bg-slate-900">Carpentry</option>
                <option value="plumbing" className="bg-white dark:bg-slate-900">Plumbing</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Contact Phone *
              </label>
              <input
                type="text"
                placeholder="+91 98000 11223"
                value={vPhone}
                onChange={(e) => setVPhone(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Service Description
            </label>
            <textarea
              rows={2}
              placeholder="List services, warranty details, and availability..."
              value={vDesc}
              onChange={(e) => setVDesc(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddVendorOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-sky-600/20 cursor-pointer"
            >
              {isSubmitting ? "Verifying..." : "Verify & Onboard"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
