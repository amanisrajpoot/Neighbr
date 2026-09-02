"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Send,
  ShieldAlert,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Lightbulb,
  ArrowRight,
  Copy,
} from "lucide-react";
import { api, AISecurityAnomalyAdminItem } from "@/lib/api";
import { useSociety } from "@/context/SocietyContext";

export default function AIAssistantAdminPage() {
  const { currentSociety } = useSociety();
  const societyId = currentSociety?.id;

  const [activeTab, setActiveTab] = useState<"notice_drafting" | "security_anomalies">("notice_drafting");
  const [anomalies, setAnomalies] = useState<AISecurityAnomalyAdminItem[]>([]);

  // Notice Drafting State
  const [topic, setTopic] = useState("Overhead Water Tank Deep Cleaning & Pressure Valve Testing");
  const [bulletPoints, setBulletPoints] = useState(
    "Water supply will be suspended on Saturday from 10:00 AM to 3:00 PM\nTanks across Tower A, B and C will undergo chemical chlorination\nResidents are advised to store drinking water in advance"
  );
  const [tone, setTone] = useState("formal");
  const [draftedNotice, setDraftedNotice] = useState<{
    title: string;
    body: string;
    category: string;
    priority: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const loadData = async () => {
    if (!societyId) return;
    try {
      const aList = await api.getSecurityAnomalies(societyId).catch(() => []);
      setAnomalies(aList);
    } catch (err) {
      console.warn("Failed to load anomalies:", err);
    }
  };

  useEffect(() => {
    if (societyId) {
      loadData();
    }
  }, [societyId]);

  const handleGenerateNotice = async () => {
    const points = bulletPoints
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);
    if (!topic.trim() || points.length === 0) {
      alert("Please provide a topic and bullet points.");
      return;
    }

    try {
      setIsGenerating(true);
      const res = await api.draftNoticeAI(societyId!, {
        topic: topic.trim(),
        bullet_points: points,
        tone,
      });
      setDraftedNotice(res);
    } catch (e) {
      alert("Failed to generate notice via AI.");
      setDraftedNotice(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishNotice = async () => {
    if (!draftedNotice || !societyId) return;
    try {
      setIsPublishing(true);
      await api.createNotice(societyId, {
        title: draftedNotice.title,
        body: draftedNotice.body,
        category: draftedNotice.category,
        priority: draftedNotice.priority,
        send_push: true,
      });
      alert("Notice published and broadcasted to all resident devices! 🚀");
      setDraftedNotice(null);
    } catch (e) {
      alert("Failed to publish notice.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-sky-500 dark:text-sky-400" />
            AI Operations & Intelligent Copilot
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated notice drafting, guard incident anomaly synthesis, and intelligent operational oversight
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("notice_drafting")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "notice_drafting"
              ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          ✨ AI Notice Drafting Studio
        </button>
        <button
          onClick={() => setActiveTab("security_anomalies")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "security_anomalies"
              ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          🛡️ Security Incident Anomalies ({anomalies.length})
        </button>
      </div>

      {activeTab === "notice_drafting" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Input Notice Key Points
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Provide the core facts or bullet points; the AI will construct a formal, respectful notice.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Notice Topic / Event *
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-semibold"
                placeholder="e.g. DG Set Generator Load Testing"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Tone & Voice
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 appearance-none cursor-pointer"
              >
                <option value="formal" className="bg-white dark:bg-slate-900">Formal & Professional</option>
                <option value="urgent" className="bg-white dark:bg-slate-900">High Priority / Urgent Alert</option>
                <option value="celebratory" className="bg-white dark:bg-slate-900">Warm & Celebratory (Festivals/Events)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Key Bullet Points (One per line) *
              </label>
              <textarea
                rows={5}
                value={bulletPoints}
                onChange={(e) => setBulletPoints(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 resize-none font-mono"
              />
            </div>

            <button
              onClick={handleGenerateNotice}
              disabled={isGenerating}
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? "Generating Polished Notice..." : "Generate Notice Draft with AI"}
            </button>
          </div>

          {/* Output Preview */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Live Preview Draft
                </span>
                {draftedNotice && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold uppercase">
                    AI READY
                  </span>
                )}
              </div>

              {draftedNotice ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {draftedNotice.title}
                  </h3>
                  <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                    {draftedNotice.body}
                  </div>
                </div>
              ) : (
                <div className="p-12 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">
                    Click &ldquo;Generate Notice Draft with AI&rdquo; to preview the formulated notice here.
                  </p>
                </div>
              )}
            </div>

            {draftedNotice && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-end gap-2">
                <button
                  onClick={() => setDraftedNotice(null)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Discard
                </button>
                <button
                  onClick={handlePublishNotice}
                  disabled={isPublishing}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isPublishing ? "Broadcasting..." : "Publish & Send Push Alert"}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {anomalies.map((anom) => (
            <div
              key={anom.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase font-mono ${
                      anom.severity === "high"
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        : anom.severity === "medium"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                    }`}
                  >
                    ⚠️ {anom.severity} SEVERITY
                  </span>
                  <span className="text-[11px] text-slate-400">{anom.occurred_at}</span>
                </div>

                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {anom.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {anom.description}
                </p>

                <div className="pt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span>💡 Recommended Action:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-normal">
                    {anom.recommended_action}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                <button
                  onClick={() => alert("Security alert escalated to on-duty guard mobile console.")}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Acknowledge
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
