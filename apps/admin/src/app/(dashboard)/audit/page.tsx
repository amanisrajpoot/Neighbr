"use client";

import React, { useState } from "react";
import {
  Search,
  Code2,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { Modal } from "@/components/Modal";

interface AuditEvent {
  id: string;
  eventType: string;
  actor: string;
  actorRole: "SUPER_ADMIN" | "SOCIETY_ADMIN" | "GUARD" | "RESIDENT" | "SYSTEM";
  targetEntity: string;
  entityId: string;
  timestamp: string;
  ipAddress: string;
  payload: Record<string, any>;
}

const SAMPLE_AUDIT_LOGS: AuditEvent[] = [
  {
    id: "aud-001",
    eventType: "VISITOR_CHECKED_IN",
    actor: "Jagdish R. (SEC-101)",
    actorRole: "GUARD",
    targetEntity: "VisitorPass",
    entityId: "pass-ananya-88",
    timestamp: "Today, 10:14 AM",
    ipAddress: "192.168.1.104 (Terminal GATE-01)",
    payload: { visitor_name: "Ananya Roy", unit_id: "Villa-42", gate_id: "GATE-01", qr_token: "NBR-TOKEN-ANANYA", override: false },
  },
  {
    id: "aud-002",
    eventType: "PASS_MANUALLY_APPROVED",
    actor: "Vikram Sethi",
    actorRole: "RESIDENT",
    targetEntity: "VisitorPass",
    entityId: "pass-swiggy-91",
    timestamp: "Today, 09:45 AM",
    ipAddress: "103.21.144.2 (Mobile App iOS)",
    payload: { visitor_name: "Swiggy Delivery Partner", unit_number: "A-102", pass_type: "delivery", valid_hours: 2 },
  },
  {
    id: "aud-003",
    eventType: "GUARD_SHIFT_CHECK_IN",
    actor: "Jagdish R.",
    actorRole: "GUARD",
    targetEntity: "GuardProfile",
    entityId: "guard-sec-101",
    timestamp: "Today, 06:00 AM",
    ipAddress: "192.168.1.104",
    payload: { shift: "Morning (06:00 - 14:00)", assigned_gate: "Main North Gate", biometric_verified: true },
  },
  {
    id: "aud-004",
    eventType: "BLACKLIST_ENTRY_ADDED",
    actor: "Admin (Siddharth V.)",
    actorRole: "SOCIETY_ADMIN",
    targetEntity: "Blacklist",
    entityId: "bl-990",
    timestamp: "Yesterday, 04:30 PM",
    ipAddress: "14.139.12.8",
    payload: { phone: "+91 99999 88888", reason: "Repeated unauthorized commercial solicitation", active: true },
  },
  {
    id: "aud-005",
    eventType: "GATE_CONFIG_CHANGED",
    actor: "System Platform",
    actorRole: "SYSTEM",
    targetEntity: "Gate",
    entityId: "gate-03",
    timestamp: "Yesterday, 02:15 PM",
    ipAddress: "127.0.0.1",
    payload: { gate_id: "GATE-03", mode: "service_delivery", auto_lock_after_seconds: 30 },
  },
];

export default function SecurityAuditPage() {
  const [logs] = useState<AuditEvent[]>(SAMPLE_AUDIT_LOGS);
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [activeInspectionPayload, setActiveInspectionPayload] = useState<Record<string, any> | null>(null);

  const filteredLogs = logs.filter((item) => {
    const matchesSearch =
      item.eventType.toLowerCase().includes(search.toLowerCase()) ||
      item.actor.toLowerCase().includes(search.toLowerCase()) ||
      item.entityId.toLowerCase().includes(search.toLowerCase());

    const matchesRole = selectedRole === "ALL" || item.actorRole === selectedRole;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="w-6 h-6 text-sky-500 dark:text-sky-400" />
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Security & Privileged Audit Log
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Immutable, append-only security events, manual approvals, and system state transitions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Integrity Verified (Hash Chain Active)
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search event type, actor name, entity ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 text-xs transition"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
          {["ALL", "GUARD", "RESIDENT", "SOCIETY_ADMIN", "SYSTEM"].map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedRole === role
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                  : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm overflow-hidden p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3">Event Type</th>
                <th className="pb-3">Actor</th>
                <th className="pb-3">Target Entity</th>
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Source / IP</th>
                <th className="pb-3 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 font-mono font-bold text-sky-600 dark:text-sky-400">
                    {log.eventType}
                  </td>
                  <td className="py-3">
                    <div className="font-semibold text-slate-900 dark:text-white">{log.actor}</div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {log.actorRole}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      {log.targetEntity} : {log.entityId}
                    </span>
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-400 font-medium">
                    {log.timestamp}
                  </td>
                  <td className="py-3 text-slate-500 dark:text-slate-400 font-mono">
                    {log.ipAddress}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => setActiveInspectionPayload(log.payload)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition"
                    >
                      <Code2 className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" /> Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Inspection Modal */}
      {activeInspectionPayload && (
        <Modal
          isOpen={true}
          onClose={() => setActiveInspectionPayload(null)}
          title="Raw Event JSON Payload"
          description="Cryptographically signed audit metadata and state transition event payload."
        >
          <div className="space-y-4">
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto">
              {JSON.stringify(activeInspectionPayload, null, 2)}
            </pre>
            <div className="flex justify-end">
              <button
                onClick={() => setActiveInspectionPayload(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
