import React from "react";
import clsx from "clsx";

interface StatusBadgeProps {
  status: string;
  variant?: "solid" | "subtle" | "outline";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = (status || "ACTIVE").toUpperCase();

  let colorClasses = "bg-slate-800/60 text-slate-400 border-slate-700/60 dot-bg-slate-400";

  if (["CHECKED_IN", "APPROVED", "ON_DUTY", "ACTIVE", "OCCUPIED", "INSIDE", "ONLINE"].includes(normalized)) {
    colorClasses = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 dot-bg-emerald-400";
  } else if (["APPROVAL_PENDING", "PENDING", "WARNING", "HIGH"].includes(normalized)) {
    colorClasses = "bg-amber-500/10 text-amber-400 border-amber-500/20 dot-bg-amber-400";
  } else if (["CHECKED_OUT", "OFF_DUTY", "RESOLVED", "EXPIRED", "VACANT", "OFFLINE"].includes(normalized)) {
    colorClasses = "bg-slate-800/80 text-slate-400 border-slate-700/60 dot-bg-slate-500";
  } else if (["REJECTED", "CANCELLED", "URGENT", "FAILED", "BLACKLISTED"].includes(normalized)) {
    colorClasses = "bg-rose-500/10 text-rose-400 border-rose-500/20 dot-bg-rose-400";
  } else if (["GUEST", "DELIVERY", "CAB", "SERVICE"].includes(normalized)) {
    colorClasses = "bg-sky-500/10 text-sky-400 border-sky-500/20 dot-bg-sky-400";
  }

  const dotColor = colorClasses.includes("emerald")
    ? "bg-emerald-400"
    : colorClasses.includes("amber")
    ? "bg-amber-400"
    : colorClasses.includes("rose")
    ? "bg-rose-400"
    : colorClasses.includes("sky")
    ? "bg-sky-400"
    : "bg-slate-400";

  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border capitalize tracking-wide",
        colorClasses
      )}
    >
      <span className={clsx("w-1.5 h-1.5 rounded-full mr-1.5", dotColor)} />
      {status.replace(/_/g, " ").toLowerCase()}
    </span>
  );
}
