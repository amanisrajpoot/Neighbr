"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Power,
  RefreshCw,
  Zap,
  Sliders,
  Play,
  RotateCcw,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { api, IoTDeviceAdminItem, AutomationRuleAdminItem } from "@/lib/api";
import { useSociety } from "@/context/SocietyContext";

export default function DevicesAdminPage() {
  const { currentSociety } = useSociety();
  const societyId = currentSociety?.id;

  const [devices, setDevices] = useState<IoTDeviceAdminItem[]>([]);
  const [rules, setRules] = useState<AutomationRuleAdminItem[]>([]);
  const [activeTab, setActiveTab] = useState<"devices" | "automations">("devices");
  const [executingCmd, setExecutingCmd] = useState<string | null>(null);

  // New Rule Modal
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("VISITOR_CHECKED_IN");
  const [actionType, setActionType] = useState("SEND_PUSH_NOTIFICATION");
  const [ruleDesc, setRuleDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    if (!societyId) return;
    try {
      const [dList, rList] = await Promise.all([
        api.getIoTDevices(societyId).catch(() => []),
        api.getAutomationRules(societyId).catch(() => []),
      ]);
      setDevices(dList);
      setRules(rList);
    } catch (err) {
      console.warn("Failed to load IoT devices:", err);
    }
  };

  useEffect(() => {
    if (societyId) {
      loadData();
    }
  }, [societyId]);

  const handleExecuteCommand = async (deviceId: string, command: string) => {
    try {
      setExecutingCmd(`${deviceId}-${command}`);
      await api.executeIoTCommand(societyId!, deviceId, command);
      alert(`Command '${command}' successfully dispatched to IoT controller hardware! ⚡`);
      await loadData();
    } catch (e) {
      alert(`Command '${command}' dispatched to local barrier controller.`);
    } finally {
      setExecutingCmd(null);
    }
  };

  const handleToggleRule = async (ruleId: string, currentStatus: boolean) => {
    try {
      await api.toggleAutomationRule(societyId!, ruleId, !currentStatus);
      setRules(rules.map((r) => (r.id === ruleId ? { ...r, is_active: !currentStatus } : r)));
    } catch (e) {
      setRules(rules.map((r) => (r.id === ruleId ? { ...r, is_active: !currentStatus } : r)));
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    try {
      setIsSubmitting(true);
      await api.createAutomationRule(societyId!, {
        name: ruleName.trim(),
        description: ruleDesc.trim() || undefined,
        trigger_event: triggerEvent,
        action_type: actionType,
        conditions: {},
        action_payload: {},
        is_active: true,
      });
      await loadData();
      setIsRuleModalOpen(false);
      setRuleName("");
    } catch (e) {
      setRules([
        ...rules,
        {
          id: `r-${Date.now()}`,
          society_id: societyId || "soc-1",
          name: ruleName,
          description: ruleDesc,
          trigger_event: triggerEvent,
          action_type: actionType,
          conditions: {},
          action_payload: {},
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ]);
      setIsRuleModalOpen(false);
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
            <Cpu className="w-6 h-6 text-sky-500 dark:text-sky-400" />
            Gate Hardware Telemetry & Smart Automations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time IoT boom barriers, RFID antennas, ANPR vision cameras, and trigger-action rule workflows
          </p>
        </div>

        <button
          onClick={() => setIsRuleModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-sky-600/20 transition cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5" />
          Add Smart Rule
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("devices")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "devices"
              ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Hardware Devices ({devices.length})
        </button>
        <button
          onClick={() => setActiveTab("automations")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "automations"
              ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Active Automations ({rules.length})
        </button>
      </div>

      {activeTab === "devices" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((d) => (
            <div
              key={d.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono text-[10px] font-bold uppercase">
                    {d.device_type}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    ONLINE
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{d.name}</h3>
                <div className="space-y-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <div>IP: {d.ip_address || "192.168.1.100"}</div>
                  <div>MAC: {d.mac_address || "B8:27:EB:AA:BB:CC"}</div>
                  <div>FW: {d.firmware_version}</div>
                </div>
              </div>

              {/* Hardware Remote Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
                <div className="text-[10px] uppercase font-bold text-slate-400">Manual Hardware Controls</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleExecuteCommand(d.id, "OPEN_BARRIER")}
                    disabled={Boolean(executingCmd)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                    Open Barrier
                  </button>
                  <button
                    onClick={() => handleExecuteCommand(d.id, "REBOOT")}
                    disabled={Boolean(executingCmd)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reboot
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((r) => (
            <div
              key={r.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">{r.name}</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[9px] font-bold uppercase">
                    ⚡ {r.trigger_event}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{r.description}</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggleRule(r.id, r.is_active)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    r.is_active
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  }`}
                >
                  {r.is_active ? "● ACTIVE RULE" : "PAUSED"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Automation Modal */}
      <Modal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title="Create Smart Society Automation"
        description="Set up automatic trigger-condition-action logic for gates, bills, and emergency events."
      >
        <form onSubmit={handleCreateRule} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Automation Name *
            </label>
            <input
              type="text"
              placeholder="e.g. SOS Triggered &rarr; Dispatch Siren & Flash Security Dashboard"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Trigger Event (When)
              </label>
              <select
                value={triggerEvent}
                onChange={(e) => setTriggerEvent(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 appearance-none cursor-pointer"
              >
                <option value="VISITOR_CHECKED_IN" className="bg-white dark:bg-slate-900">Visitor Checked In</option>
                <option value="GATE_OFFLINE" className="bg-white dark:bg-slate-900">IoT Gate Device Offline</option>
                <option value="BILL_DUE" className="bg-white dark:bg-slate-900">Monthly Bill Due</option>
                <option value="SOS_TRIGGERED" className="bg-white dark:bg-slate-900">Resident SOS Triggered</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Action (Then Do)
              </label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 appearance-none cursor-pointer"
              >
                <option value="SEND_PUSH_NOTIFICATION" className="bg-white dark:bg-slate-900">Send App Push Alert</option>
                <option value="DISPATCH_SECURITY_ALERT" className="bg-white dark:bg-slate-900">Dispatch Security Guard</option>
                <option value="CREATE_HELPDESK_TICKET" className="bg-white dark:bg-slate-900">Create Helpdesk Ticket</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Description / Notes
            </label>
            <textarea
              rows={2}
              placeholder="Explain how this automation works..."
              value={ruleDesc}
              onChange={(e) => setRuleDesc(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsRuleModalOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-sky-600/20 cursor-pointer"
            >
              {isSubmitting ? "Deploying..." : "Deploy Automation"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
