"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Sun,
  Moon,
  ShieldCheck,
  UserCheck,
  Check,
  AlertTriangle,
  Radio,
  ExternalLink,
  CheckCheck,
} from "lucide-react";
import Link from "next/link";
import { useSociety } from "@/context/SocietyContext";
import { useAuth, RoleType } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

interface NotificationItem {
  id: string;
  type: "alert" | "visitor" | "guard" | "notice";
  title: string;
  message: string;
  time: string;
  unread: boolean;
  priority?: "urgent" | "normal";
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    type: "alert",
    title: "🚨 Heavy Rain Alert",
    message: "Precautionary basement parking advisory published to resident apps.",
    time: "10m ago",
    unread: true,
  },
  {
    id: "notif-2",
    type: "visitor",
    title: "Visitor Checked In",
    message: "Ananya Roy (Guest) passed through Main North Gate to Villa-42.",
    time: "25m ago",
    unread: true,
  },
  {
    id: "notif-3",
    type: "guard",
    title: "Guard Shift Active",
    message: "Jagdish R. (SEC-101) checked in on active duty at Terminal GATE-01.",
    time: "1h ago",
    unread: false,
  },
  {
    id: "notif-4",
    type: "notice",
    title: "AGM 2026 Scheduled",
    message: "Annual General Body Meeting notice broadcasted to 11 resident flats.",
    time: "3h ago",
    unread: false,
  },
];

export function Topbar() {
  const { currentSociety, societies, selectSociety } = useSociety();
  const { user, logout, activeRole, availableRoles, switchRole } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [isSocietyDropdownOpen, setIsSocietyDropdownOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  // Real-Time WebSocket for Admin Notifications & Emergency SOS
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      try {
        ws = new WebSocket("ws://localhost:8000/api/v1/notifications/ws/admin");

        ws.onopen = () => {
          console.log("[Admin] Real-Time Notifications WebSocket Connected");
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "NOTIFICATION") {
              const item = data.data;
              const isUrgent = item.category === "emergency" || item.title?.includes("SOS") || item.title?.includes("EMERGENCY");
              
              const newNotif: NotificationItem = {
                id: item.id || `notif-${Date.now()}`,
                title: item.title || "Society Notification",
                message: item.body || "New event received from resident or security.",
                time: "Just now",
                unread: true,
                type: isUrgent ? "alert" : "notice",
                priority: isUrgent ? "urgent" : "normal",
              };

              setNotifications((prev) => [newNotif, ...prev]);

              // Request notification permission if not yet decided
              if (typeof window !== "undefined" && "Notification" in window) {
                if (Notification.permission === "default") {
                  Notification.requestPermission();
                } else if (Notification.permission === "granted" && isUrgent) {
                  new Notification(newNotif.title, { body: newNotif.message });
                }
              }
            }
          } catch (e) {
            console.error("Failed to parse WebSocket message", e);
          }
        };

        ws.onclose = () => {
          reconnectTimeout = setTimeout(connect, 5000);
        };
      } catch (err) {
        console.warn("WebSocket init error:", err);
      }
    };

    connect();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const currentRoleObj = availableRoles.find((r) => r.id === activeRole) || availableRoles[0];

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between flex-shrink-0 z-20 gap-4 transition-colors">
      {/* Left: Society Selector & Global Search */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Society Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsSocietyDropdownOpen(!isSocietyDropdownOpen);
              setIsRoleMenuOpen(false);
              setIsNotifOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors text-left"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-xs font-extrabold text-slate-800 dark:text-white truncate max-w-[170px]">
              {currentSociety?.name || "Greenwood Palms"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-0.5" />
          </button>

          {isSocietyDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-2xl z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-150">
              <span className="block px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Select Active Estate
              </span>
              {societies.map((soc) => (
                <button
                  key={soc.id}
                  onClick={() => {
                    selectSociety(soc.id);
                    setIsSocietyDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition ${
                    currentSociety?.id === soc.id
                      ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="truncate">{soc.name}</span>
                  {currentSociety?.id === soc.id && <span className="text-sky-500 text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Global Search Bar */}
        <div className="relative flex-1 max-w-sm hidden md:block">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search flats, residents, visitor passes..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-sky-500 transition text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Right: Theme Toggle, Notifications, Role Switcher, & Logout */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Dark / Light Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-sky-500 dark:hover:text-sky-400 transition flex items-center justify-center cursor-pointer shadow-sm"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400 transition transform hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600 transition transform hover:-rotate-12" />
          )}
        </button>

        {/* Interactive Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              setIsRoleMenuOpen(false);
              setIsSocietyDropdownOpen(false);
            }}
            title="Estate Activity & Notifications"
            className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shadow-2xl z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between pb-2.5 px-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-extrabold text-[10px]">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-80 overflow-y-auto my-1">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-2.5 rounded-2xl transition flex items-start gap-3 my-0.5 ${
                      notif.unread
                        ? "bg-slate-50 dark:bg-slate-800/50"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 font-bold ${
                        notif.type === "alert"
                          ? "bg-red-500/10 text-red-500"
                          : notif.type === "visitor"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : notif.type === "guard"
                          ? "bg-purple-500/10 text-purple-500"
                          : "bg-sky-500/10 text-sky-500"
                      }`}
                    >
                      {notif.type === "alert" ? "🚨" : notif.type === "visitor" ? "👤" : notif.type === "guard" ? "🛡️" : "📢"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{notif.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <Link
                  href="/notices"
                  onClick={() => setIsNotifOpen(false)}
                  className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Open Notice Board Directory</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Compact Live Status Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
          <span>Live System</span>
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        {/* Role Persona Switcher Pill */}
        <div className="relative">
          <button
            onClick={() => {
              setIsRoleMenuOpen(!isRoleMenuOpen);
              setIsSocietyDropdownOpen(false);
              setIsNotifOpen(false);
            }}
            className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0">
              {currentRoleObj.icon}
            </div>

            <div className="hidden sm:block text-left">
              <span className="block text-xs font-extrabold text-slate-900 dark:text-white truncate max-w-[130px]">
                {user?.full_name?.replace("(Admin)", "").trim() || "Aman Sharma"}
              </span>
              <span className="block text-[10px] text-sky-600 dark:text-sky-400 font-bold uppercase tracking-wider">
                {currentRoleObj.badge}
              </span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </button>

          {/* Role Switching Dropdown Menu */}
          {isRoleMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-2xl z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Switch Active Role Persona
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Change permissions, interface view, and active scope:
                </p>
              </div>

              <div className="space-y-1">
                {availableRoles.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      switchRole(r.id);
                      setIsRoleMenuOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-xs flex items-start gap-2.5 transition ${
                      activeRole === r.id
                        ? "bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span className="text-lg leading-none mt-0.5">{r.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold">{r.label}</span>
                        {activeRole === r.id && <Check className="w-3.5 h-3.5 text-sky-500 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{r.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Logout Option */}
              <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out of Estate Portal</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
