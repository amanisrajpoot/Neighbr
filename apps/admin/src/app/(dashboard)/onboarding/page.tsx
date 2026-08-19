"use client";

import React, { useState } from "react";
import {
  Building2,
  Shield,
  Users,
  Upload,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import Link from "next/link";

export default function SocietyOnboardingWizardPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [societyData, setSocietyData] = useState({
    name: "Greenwood Palms Heights",
    address: "Outer Ring Road, Bellandur",
    city: "Bengaluru",
    pincode: "560103",
    regNumber: "SOC/BLR/2024/889",
  });

  const [towers, setTowers] = useState([
    { id: "t-1", name: "Tower A (Orchid)", floors: 14, unitsPerFloor: 4 },
    { id: "t-2", name: "Tower B (Lotus)", floors: 14, unitsPerFloor: 4 },
    { id: "t-3", name: "Villa Cluster", floors: 2, unitsPerFloor: 12 },
  ]);

  const [gates, setGates] = useState([
    { id: "g-1", name: "Main North Gate", code: "GATE-01", type: "entry_exit" },
    { id: "g-2", name: "East Resident Gate", code: "GATE-02", type: "resident_only" },
    { id: "g-3", name: "South Service Gate", code: "GATE-03", type: "service_delivery" },
  ]);

  const [csvUploaded, setCsvUploaded] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [activated, setActivated] = useState(false);

  const addTower = () => {
    setTowers([
      ...towers,
      { id: `t-${Date.now()}`, name: `Tower ${String.fromCharCode(65 + towers.length)}`, floors: 10, unitsPerFloor: 4 },
    ]);
  };

  const removeTower = (id: string) => {
    setTowers(towers.filter((t) => t.id !== id));
  };

  const addGate = () => {
    setGates([
      ...gates,
      { id: `g-${Date.now()}`, name: `Gate 0${gates.length + 1}`, code: `GATE-0${gates.length + 1}`, type: "entry_exit" },
    ]);
  };

  const removeGate = (id: string) => {
    setGates(gates.filter((g) => g.id !== id));
  };

  const handleActivateSociety = () => {
    setIsActivating(true);
    setTimeout(() => {
      setIsActivating(false);
      setActivated(true);
    }, 1500);
  };

  const totalCalculatedUnits = towers.reduce((acc, t) => acc + t.floors * t.unitsPerFloor, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-sky-500 dark:text-sky-400" />
          Society Onboarding Wizard
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure community infrastructure, units, security terminals, and resident rosters.
        </p>
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { step: 1, title: "1. Society Info", icon: Building2 },
          { step: 2, title: "2. Towers & Units", icon: Building2 },
          { step: 3, title: "3. Gates & Security", icon: Shield },
          { step: 4, title: "4. Resident CSV", icon: Users },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = currentStep === item.step;
          const isDone = currentStep > item.step || activated;

          return (
            <div
              key={item.step}
              className={`p-3.5 rounded-xl border transition-all ${
                isActive
                  ? "bg-sky-500/10 border-sky-500/40 text-sky-600 dark:text-sky-400 shadow-sm"
                  : isDone
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${isActive ? "text-sky-500" : isDone ? "text-emerald-500" : "text-slate-400"}`} />
                <span className="text-xs font-bold uppercase tracking-wider">{item.title}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Society Info */}
      {currentStep === 1 && (
        <div className="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Basic Society Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Society Name *</label>
              <input
                type="text"
                value={societyData.name}
                onChange={(e) => setSocietyData({ ...societyData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-sky-500 text-xs text-slate-900 dark:text-white font-medium"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Physical Address *</label>
              <input
                type="text"
                value={societyData.address}
                onChange={(e) => setSocietyData({ ...societyData, address: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-sky-500 text-xs text-slate-900 dark:text-white font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">City *</label>
              <input
                type="text"
                value={societyData.city}
                onChange={(e) => setSocietyData({ ...societyData, city: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-sky-500 text-xs text-slate-900 dark:text-white font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">PIN Code *</label>
              <input
                type="text"
                value={societyData.pincode}
                onChange={(e) => setSocietyData({ ...societyData, pincode: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-sky-500 text-xs text-slate-900 dark:text-white font-medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Towers & Units */}
      {currentStep === 2 && (
        <div className="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Towers, Blocks & Unit Layout</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Total estimated units: <span className="font-bold text-sky-600 dark:text-sky-400">{totalCalculatedUnits} Flats</span>
              </p>
            </div>
            <button
              onClick={addTower}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 font-bold text-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Tower
            </button>
          </div>

          <div className="space-y-3">
            {towers.map((tower, idx) => (
              <div key={tower.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Tower / Block Name</label>
                  <input
                    type="text"
                    value={tower.name}
                    onChange={(e) => {
                      const updated = [...towers];
                      updated[idx].name = e.target.value;
                      setTowers(updated);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-semibold"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Floors</label>
                  <input
                    type="number"
                    value={tower.floors}
                    onChange={(e) => {
                      const updated = [...towers];
                      updated[idx].floors = parseInt(e.target.value) || 1;
                      setTowers(updated);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-semibold text-center"
                  />
                </div>
                <div className="w-28">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Units / Floor</label>
                  <input
                    type="number"
                    value={tower.unitsPerFloor}
                    onChange={(e) => {
                      const updated = [...towers];
                      updated[idx].unitsPerFloor = parseInt(e.target.value) || 1;
                      setTowers(updated);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-semibold text-center"
                  />
                </div>
                <button
                  onClick={() => removeTower(tower.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Gates & Access Points */}
      {currentStep === 3 && (
        <div className="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Security Gate & Terminal Configuration</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Configure guard terminals and authorized access points.</p>
            </div>
            <button
              onClick={addGate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 font-bold text-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Gate
            </button>
          </div>

          <div className="space-y-3">
            {gates.map((gate, idx) => (
              <div key={gate.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Gate Name</label>
                  <input
                    type="text"
                    value={gate.name}
                    onChange={(e) => {
                      const updated = [...gates];
                      updated[idx].name = e.target.value;
                      setGates(updated);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-semibold"
                  />
                </div>
                <div className="w-28">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Terminal Code</label>
                  <input
                    type="text"
                    value={gate.code}
                    onChange={(e) => {
                      const updated = [...gates];
                      updated[idx].code = e.target.value;
                      setGates(updated);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
                <div className="w-44">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Gate Mode</label>
                  <select
                    value={gate.type}
                    onChange={(e) => {
                      const updated = [...gates];
                      updated[idx].type = e.target.value;
                      setGates(updated);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-semibold cursor-pointer"
                  >
                    <option value="entry_exit">Full Entry & Exit</option>
                    <option value="resident_only">Resident Fast-Track</option>
                    <option value="service_delivery">Service & Delivery</option>
                  </select>
                </div>
                <button
                  onClick={() => removeGate(gate.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Bulk CSV Resident Import */}
      {currentStep === 4 && (
        <div className="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Bulk Resident Import</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Upload a CSV containing unit assignments, resident names, mobile numbers, and ownership types.
          </p>

          <div
            onClick={() => setCsvUploaded(true)}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
              csvUploaded
                ? "border-emerald-500/60 bg-emerald-500/10"
                : "border-slate-300 dark:border-slate-800 hover:border-sky-500 bg-slate-50/50 dark:bg-slate-950/50"
            }`}
          >
            {csvUploaded ? (
              <div className="space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <h3 className="font-bold text-sm text-emerald-950 dark:text-emerald-300">society_residents_greenwood.csv loaded</h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  112 resident records parsed & validated with zero syntax errors.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <FileSpreadsheet className="w-10 h-10 text-sky-500 dark:text-sky-400 mx-auto" />
                <div>
                  <p className="font-bold text-xs text-slate-900 dark:text-white">Click to upload or drag & drop CSV</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Columns: UnitNumber, Tower, ResidentName, Phone, Role (Owner/Tenant)
                  </p>
                </div>
                <span className="inline-block px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg shadow-2xs">
                  Download Sample CSV Template
                </span>
              </div>
            )}
          </div>

          {csvUploaded && (
            <div className="p-4 rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-800 text-slate-100 flex items-center justify-between">
              <div>
                <p className="font-bold text-xs text-white">Ready to Activate Community</p>
                <p className="text-[11px] text-slate-400">All modules, database schemas, and gate tokens will be provisioned.</p>
              </div>
              <button
                onClick={handleActivateSociety}
                disabled={isActivating || activated}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                {isActivating ? "Provisioning..." : activated ? "✓ Activated" : "Activate Society"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-2">
        {currentStep > 1 ? (
          <button
            onClick={() => setCurrentStep(currentStep - 1)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Previous
          </button>
        ) : (
          <div />
        )}

        {currentStep < 4 ? (
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 cursor-pointer transition"
          >
            Next Step <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : activated ? (
          <Link
            href="/"
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 cursor-pointer transition"
          >
            Launch Command Dashboard <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
