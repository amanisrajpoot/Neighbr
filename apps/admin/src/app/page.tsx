"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  UserCheck,
  Building2,
  Bell,
  AlertTriangle,
  Radio,
  ExternalLink,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { StatsCard } from "@/components/StatsCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal } from "@/components/Modal";
import { api, DashboardStats, GateItem, VisitorPassItem } from "@/lib/api";
import { useSociety } from "@/context/SocietyContext";

export default function CommandDashboardPage() {
  const { currentSociety } = useSociety();

  const [stats, setStats] = useState<DashboardStats>({
    active_visitors_inside: 0,
    guards_on_duty: 0,
    total_units: 0,
    occupied_units: 0,
    active_notices: 0,
    open_sos_alerts: 0,
  });

  const [gates, setGates] = useState<GateItem[]>([]);
  const [activity, setActivity] = useState<VisitorPassItem[]>([]);

  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    if (!currentSociety?.id) return;
    const societyId = currentSociety.id;
    try {
      setIsLoading(true);
      const [sData, gData, pData] = await Promise.all([
        api.getDashboardStats(societyId).catch(() => null),
        api.getGates(societyId).catch(() => []),
        api.getVisitorPasses(societyId).catch(() => []),
      ]);

      if (sData) setStats(sData);
      setGates(gData);
      setActivity(pData);
    } catch (err) {
      console.warn("Failed to load dashboard stats:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentSociety?.id) {
      loadData();
    }
  }, [currentSociety?.id]);

  const handleSendBroadcast = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!alertTitle.trim() || !alertMessage.trim() || !currentSociety?.id) return;
    try {
      setIsBroadcasting(true);
      await api.createNotice(currentSociety.id, {
        title: `🚨 EMERGENCY: ${alertTitle.trim()}`,
        body: alertMessage.trim(),
        category: "emergency",
        priority: "urgent",
        send_push: true,
      });
      setIsBroadcastModalOpen(false);
      setAlertTitle("");
      setAlertMessage("");
      await loadData();
    } catch (err) {
      console.warn("Failed to broadcast alert:", err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Live Operations
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {currentSociety?.name || "Greenwood Palms Heights"}
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Estate Command Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time security telemetry, gate access flow, and community health overview
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsBroadcastModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-600/20 transition cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" />
            Trigger Society Alert
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Active Visitors Inside"
          value={stats.active_visitors_inside}
          subtitle="Checked-in & on premises"
          icon={<UserCheck className="w-5 h-5 text-sky-500 dark:text-sky-400" />}
          trend={{ value: "+2 in last hr", isPositive: true }}
          color="sky"
        />
        <StatsCard
          title="Guards On Duty"
          value={stats.guards_on_duty}
          subtitle="Across active gates"
          icon={<ShieldCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />}
          color="emerald"
        />
        <StatsCard
          title="Occupied Units"
          value={`${stats.occupied_units} / ${stats.total_units}`}
          subtitle="Resident occupancy"
          icon={<Building2 className="w-5 h-5 text-purple-500 dark:text-purple-400" />}
          color="purple"
        />
        <StatsCard
          title="Active Notices"
          value={stats.active_notices}
          subtitle="Published this week"
          icon={<Bell className="w-5 h-5 text-amber-500 dark:text-amber-400" />}
          color="amber"
        />
        <StatsCard
          title="Open SOS Alerts"
          value={stats.open_sos_alerts}
          subtitle="Emergency triggers"
          icon={<AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />}
          color="rose"
        />
      </div>

      {/* Two Column Layout: Gate Monitors & Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gate Terminal Monitors */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-sky-500" />
              Active Gate Terminals
            </h2>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">● All Online</span>
          </div>

          <div className="space-y-3">
            {gates.map((gate) => (
              <div
                key={gate.id}
                className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">{gate.code}</span>
                  <StatusBadge status="ONLINE" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{gate.name}</h3>
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Guard on Duty</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Jagdish R. (SEC-101)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Security Event Log */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">Live Security Event Log</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time gate pass validations and egress logs</p>
            </div>
            <Link
              href="/visitors"
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              <span>Full Log Directory</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {activity.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs">
                    {item.visitor_name.charAt(0)}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{item.visitor_name}</span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                      Destination: <strong className="text-sky-600 dark:text-sky-400">{item.unit_number || "Gate"}</strong> • {item.pass_type}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">{item.valid_until}</span>
                  <StatusBadge status={item.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Emergency Society Alert Modal */}
      <Modal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        title="🚨 Broadcast Emergency Society Alert"
        description="This will immediately push a high-priority alert banner across all resident mobile devices and gate terminals."
      >
        <form onSubmit={handleSendBroadcast} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Emergency Headline *
            </label>
            <input
              type="text"
              placeholder="e.g. Severe Storm Alert / Water Outage / Fire Drill"
              value={alertTitle}
              onChange={(e) => setAlertTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Instructions for Residents & Security Team *
            </label>
            <textarea
              rows={4}
              placeholder="Explain necessary actions, evacuation routes, helpline numbers, or affected wings..."
              value={alertMessage}
              onChange={(e) => setAlertMessage(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-red-500 resize-none"
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsBroadcastModalOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isBroadcasting}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-red-600/25 flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {isBroadcasting ? "Broadcasting Alarm..." : "Dispatch Emergency Alert"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
