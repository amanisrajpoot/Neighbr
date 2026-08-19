"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  UserCheck,
  Bell,
  Wand2,
  Lock,
  Wrench,
  Trophy,
  Receipt,
  MessageSquare,
  ShoppingBag,
  Cpu,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function Sidebar() {
  const pathname = usePathname();
  const { activeRole, availableRoles } = useAuth();

  const currentRoleObj = availableRoles.find((r) => r.id === activeRole) || availableRoles[0];

  const allNavigation = [
    { name: "Command Dashboard", href: "/", icon: LayoutDashboard, roles: ["society_admin", "security_supervisor", "accountant", "committee"] },
    { name: "Towers & Units", href: "/units", icon: Building2, roles: ["society_admin", "committee"] },
    { name: "Resident Directory", href: "/residents", icon: Users, roles: ["society_admin", "committee", "security_supervisor"] },
    { name: "Guards & Gates", href: "/guards", icon: ShieldCheck, roles: ["society_admin", "security_supervisor", "guard"] },
    { name: "Visitor Logs & Security", href: "/visitors", icon: UserCheck, roles: ["society_admin", "security_supervisor", "guard", "committee"] },
    { name: "Maintenance & Invoices", href: "/billing", icon: Receipt, roles: ["society_admin", "accountant", "committee"] },
    { name: "Helpdesk & Service", href: "/helpdesk", icon: Wrench, roles: ["society_admin", "committee", "resident"] },
    { name: "Clubhouse Amenities", href: "/amenities", icon: Trophy, roles: ["society_admin", "committee", "resident"] },
    { name: "Community & Polls", href: "/community", icon: MessageSquare, roles: ["society_admin", "committee", "resident"] },
    { name: "Marketplace & Vendors", href: "/marketplace", icon: ShoppingBag, roles: ["society_admin", "committee", "resident"] },
    { name: "IoT Devices & Rules", href: "/devices", icon: Cpu, roles: ["society_admin", "security_supervisor"] },
    { name: "AI Copilot & Ops", href: "/ai", icon: Sparkles, roles: ["society_admin", "committee"] },
    { name: "Notice Board", href: "/notices", icon: Bell, roles: ["society_admin", "committee", "security_supervisor", "accountant", "resident", "guard"] },
    { name: "Security Audit Log", href: "/audit", icon: Lock, roles: ["society_admin", "security_supervisor", "committee"] },
    { name: "Onboarding Wizard", href: "/onboarding", icon: Wand2, roles: ["society_admin"] },
  ];

  const visibleNav = allNavigation.filter((item) => item.roles.includes(activeRole));

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col flex-shrink-0 min-h-screen text-slate-700 dark:text-slate-300 transition-colors">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-sky-500/25">
          N
        </div>
        <div>
          <span className="font-black text-lg text-slate-900 dark:text-white tracking-tight">Neighbr</span>
          <span className="block text-[10px] uppercase font-bold tracking-wider text-sky-600 dark:text-sky-400">
            Estate Console
          </span>
        </div>
      </div>

      {/* Role Indicator Banner */}
      <div className="px-4 pt-4">
        <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center gap-2">
          <span className="text-base">{currentRoleObj.icon}</span>
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
              Active Persona:
            </span>
            <span className="block text-xs font-extrabold text-slate-800 dark:text-white truncate">
              {currentRoleObj.label.split("(")[0].trim()}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all",
                isActive
                  ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
              )}
            >
              <Icon className={clsx("w-4 h-4", isActive ? "text-white" : "text-slate-400")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile Summary */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-black text-xs">
            {currentRoleObj.icon}
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">
              {currentRoleObj.badge}
            </span>
            <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              ● Connected
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
