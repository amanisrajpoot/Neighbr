"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Phone, KeyRound, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, requestOtp } = useAuth();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("+91 98765 00001");
  const [otp, setOtp] = useState("123456");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cleanPhone = phone.replace(/\s+/g, "");

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    if (cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsSubmitting(true);
    const res = await requestOtp(cleanPhone);
    setIsSubmitting(false);

    if (res.success) {
      setStep("otp");
    } else {
      setError(res.message || "Failed to send OTP code");
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit OTP code");
      return;
    }

    setIsSubmitting(true);
    const res = await login(cleanPhone, otp);
    setIsSubmitting(false);

    if (res.success) {
      router.replace("/");
    } else {
      setError(res.error || "Authentication failed. Please verify your OTP code.");
    }
  };

  const handleQuickDemo = async (demoPhone: string) => {
    setPhone(demoPhone);
    setOtp("123456");
    setError(null);
    setIsSubmitting(true);
    const clean = demoPhone.replace(/\s+/g, "");
    const res = await login(clean, "123456");
    setIsSubmitting(false);
    if (res.success) {
      router.replace("/");
    } else {
      setError(res.error || "Demo login failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-lg shadow-sky-500/30">
            N
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Neighbr Admin Portal</h1>
          <p className="text-xs text-slate-400">
            Estate Operations, Security Access & Resident Governance
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Phone Number Input */}
        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="+91 98765 00001"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                We will send a 6-digit cryptographic OTP to verify your estate role.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-sky-600/25 transition"
            >
              {isSubmitting ? "Sending OTP..." : "Continue with OTP →"}
            </button>
          </form>
        ) : (
          /* Step 2: 6-Digit OTP Verification */
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Enter 6-Digit Code
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Code sent to <span className="text-white font-mono">{phone}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="text-xs text-sky-400 hover:underline"
              >
                Change
              </button>
            </div>

            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-lg font-mono text-white text-center tracking-widest focus:outline-none focus:border-sky-500"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-sky-600/25 transition"
            >
              {isSubmitting ? "Verifying..." : "Verify & Access Command Center →"}
            </button>
          </form>
        )}

        {/* Quick Demo Shortcuts */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
            ⚡ Quick 1-Tap Demo Logins:
          </span>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo("+91 98765 00001")}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left flex items-center justify-between text-xs transition"
            >
              <div>
                <span className="font-bold text-white block">🏢 Society Administrator</span>
                <span className="text-[10px] text-slate-400 font-mono">+91 98765 00001 • Aman Sharma</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo("+91 98765 30002")}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left flex items-center justify-between text-xs transition"
            >
              <div>
                <span className="font-bold text-white block">🏡 Resident Account (Villa-42)</span>
                <span className="text-[10px] text-slate-400 font-mono">+91 98765 30002 • Siddharth Verma</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <p className="text-xs text-slate-500 mt-6 text-center">
        Neighbr Modular Monolith • RBAC & Device Session Bound Security
      </p>
    </div>
  );
}
