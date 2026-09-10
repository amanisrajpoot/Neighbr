"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Database, Server, RefreshCw, CheckCircle2, AlertCircle, X, Shield, ChevronDown } from "lucide-react";
import { useSociety } from "@/context/SocietyContext";
import { useAuth } from "@/context/AuthContext";
import { getAdminToken } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const HEALTH_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, "") + "/health";

interface HealthData {
  status: "healthy" | "degraded" | "offline";
  service?: string;
  version?: string;
  database?: {
    status: string;
    connected: boolean;
    type: string;
    latency_ms?: number;
  };
  latencyMs?: number;
  error?: string;
}

export function DevStatusIndicator() {
  const { currentSociety } = useSociety();
  const { user } = useAuth();
  const [health, setHealth] = useState<HealthData>({ status: "offline" });
  const [checking, setChecking] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const checkHealth = useCallback(async () => {
    try {
      setChecking(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const t0 = performance.now();
      const res = await fetch(HEALTH_URL, {
        signal: controller.signal,
        cache: "no-store",
      }).catch(async () => {
        return fetch(`${API_BASE_URL}/health`, {
          signal: controller.signal,
          cache: "no-store",
        });
      });
      clearTimeout(timeoutId);

      const roundTripMs = Math.round(performance.now() - t0);

      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        setHealth({
          status: data.status === "healthy" ? "healthy" : "degraded",
          service: data.service,
          version: data.version,
          database: data.database || {
            status: "connected",
            connected: true,
            type: "postgresql",
          },
          latencyMs: roundTripMs,
        });
      } else {
        setHealth({
          status: "offline",
          error: `HTTP ${res?.status || "Unknown"}`,
        });
      }
    } catch (err: any) {
      setHealth({
        status: "offline",
        error: err?.message || "Unreachable",
      });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const isConnected = health.status === "healthy";
  const dbConnected = health.database?.connected !== false && isConnected;
  const token = typeof window !== "undefined" ? getAdminToken() : null;

  return (
    <div className="relative">
      {/* Topbar Pill Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition cursor-pointer select-none ${
          isConnected
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
            : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/20"
        }`}
        title="Click to view Backend & Database synchronization telemetry"
      >
        <div
          className={`w-2 h-2 rounded-full shrink-0 ${
            isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
          }`}
        />
        <span className="hidden sm:inline">
          {checking
            ? "Checking..."
            : isConnected
            ? `Backend: 8000 • DB: ${health.database?.type || "pg"} (${
                health.database?.latency_ms ?? health.latencyMs
              }ms)`
            : "Backend: Offline"}
        </span>
        <span className="sm:hidden">
          {isConnected ? "Live BE & DB" : "BE Offline"}
        </span>
        <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-extrabold">
          DEV
        </span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-84 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-50 text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    isConnected ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
                <span className="text-sm font-extrabold">
                  Backend & Database Telemetry
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Diagnostic Table */}
            <div className="my-3 space-y-2.5 text-xs bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <Server className="w-3.5 h-3.5 text-sky-500" />
                  Backend Service
                </span>
                <span
                  className={`font-bold flex items-center gap-1 ${
                    isConnected ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {isConnected ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Connected (FastAPI)
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      Offline ({health.error || "Unreachable"})
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <Database className="w-3.5 h-3.5 text-indigo-500" />
                  Database
                </span>
                <span
                  className={`font-bold flex items-center gap-1 ${
                    dbConnected ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {dbConnected ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {health.database?.type?.toUpperCase() || "POSTGRESQL"} ({health.database?.latency_ms ?? health.latencyMs}ms)
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      Disconnected
                    </>
                  )}
                </span>
              </div>

              <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  API Target
                </span>
                <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                  {API_BASE_URL}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Active Society
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                  {currentSociety?.name || "None Selected"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-500" />
                  Admin Session
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {user?.full_name || "Aman Sharma"} ({token ? "Token Active" : "No Token"})
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={checkHealth}
                disabled={checking}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 text-white hover:bg-sky-600 font-bold text-xs transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
                <span>{checking ? "Pinging..." : "Ping Now"}</span>
              </button>

              <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                Stripped in production build
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
