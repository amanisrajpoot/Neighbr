import React from "react";
import clsx from "clsx";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: "sky" | "emerald" | "amber" | "rose" | "purple";
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = "sky",
}: StatsCardProps) {
  const colorMap = {
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/60 p-5 shadow-sm border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={clsx("p-2 rounded-xl border", colorMap[color])}>
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{value}</span>
        {trend && (
          <span
            className={clsx(
              "text-[10px] font-bold px-2 py-0.5 rounded-full border",
              trend.isPositive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
            )}
          >
            {trend.isPositive ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
  );
}
