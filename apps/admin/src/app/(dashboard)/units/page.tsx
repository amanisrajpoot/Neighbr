"use client";

import React, { useState, useEffect } from "react";
import { Building2, Plus, Home, Layers, BadgeAlert } from "lucide-react";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/StatusBadge";
import { api, BuildingItem, UnitItem } from "@/lib/api";
import { useSociety } from "@/context/SocietyContext";
import { isValidUnitNumber } from "@/lib/validation";

export default function UnitsPage() {
  const { currentSociety } = useSociety();
  const societyId = currentSociety?.id;

  const [buildings, setBuildings] = useState<BuildingItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [unitNumber, setUnitNumber] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [unitType, setUnitType] = useState("apartment");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    if (!societyId) return;
    try {
      setIsLoading(true);
      const [bList, uList] = await Promise.all([
        api.getBuildings(societyId).catch(() => []),
        api.getUnits(societyId).catch(() => []),
      ]);

      setBuildings(bList);
      if (bList.length > 0) {
        setBuildingId((prev) => prev || bList[0].id);
      }
      setUnits(uList);
    } catch (err) {
      console.warn("Failed to load units from backend:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (societyId) {
      loadData();
    }
  }, [societyId]);

  const handleCreateUnit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const cleanUnit = unitNumber.trim().toUpperCase();
    if (!isValidUnitNumber(cleanUnit)) {
      setErrorMessage("Please enter a valid flat number (e.g. A-104, B-302, Villa-45).");
      return;
    }

    const targetBuildingId = buildingId || buildings[0]?.id;
    if (!targetBuildingId || !societyId) {
      setErrorMessage("Building configuration not loaded. Please select a tower.");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.createUnit(societyId, {
        building_id: targetBuildingId,
        unit_number: cleanUnit,
        unit_type: unitType,
      });

      await loadData();
      setIsAddModalOpen(false);
      setUnitNumber("");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save unit to database.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUnits = selectedBuildingId
    ? units.filter((u) => u.building_id === selectedBuildingId)
    : units;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-sky-500 dark:text-sky-400" />
            Towers & Unit Inventory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Hierarchy of residential towers, wings, floor plans, and flat occupancy
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
          Add Single Flat
        </button>
      </div>

      {/* Buildings / Towers Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedBuildingId(null)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            selectedBuildingId === null
              ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
              : "bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          All Towers & Wings ({units.length} Units)
        </button>
        {buildings.map((bldg) => (
          <button
            key={bldg.id}
            onClick={() => setSelectedBuildingId(bldg.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedBuildingId === bldg.id
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                : "bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {bldg.name} ({bldg.total_floors} Floors)
          </button>
        ))}
      </div>

      {/* Units Grid */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Unit Directory ({filteredUnits.length} Flats)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {filteredUnits.map((unit) => (
            <div
              key={unit.id}
              className={`p-4 rounded-2xl border transition-all ${
                unit.is_occupied
                  ? "bg-slate-50 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
                  : "bg-slate-50/50 dark:bg-slate-950/40 border-dashed border-slate-200 dark:border-slate-800 hover:border-sky-500/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-base font-black text-slate-900 dark:text-white">{unit.unit_number}</span>
                <StatusBadge status={unit.is_occupied ? "OCCUPIED" : "VACANT"} />
              </div>
              <div className="mt-3 space-y-1">
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 capitalize font-medium">
                  Type: {unit.unit_type}
                </span>
                <span className="block text-[11px] text-slate-700 dark:text-slate-300 font-semibold truncate">
                  {unit.is_occupied ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">● {unit.resident_name || "Active Resident"}</span>
                  ) : (
                    <span className="text-slate-400">No active resident</span>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Unit Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Flat to Society Inventory"
        description="Register a new unit/flat to enable resident onboarding and security gate passes."
      >
        <form onSubmit={handleCreateUnit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <BadgeAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Select Tower / Wing *
            </label>
            <div className="relative">
              <Layers className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={buildingId}
                onChange={(e) => setBuildingId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 appearance-none cursor-pointer"
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {b.name} ({b.code || "TWR"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Flat / Unit Number *
            </label>
            <div className="relative">
              <Home className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. A-104 or Villa-45"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Unit Configuration
            </label>
            <select
              value={unitType}
              onChange={(e) => setUnitType(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 appearance-none cursor-pointer"
            >
              <option value="apartment" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Standard Apartment</option>
              <option value="penthouse" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Penthouse</option>
              <option value="villa" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Independent Villa</option>
              <option value="studio" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Studio Suite</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-sky-600/20"
            >
              {isSubmitting ? "Creating..." : "Save Unit to Database"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
