"use client";

import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <h2 className="text-3xl font-extrabold text-slate-900">404 — Page Not Found</h2>
      <p className="text-sm text-slate-500 max-w-md">
        The requested administration page does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-md shadow-sky-600/20"
      >
        Return to Command Dashboard
      </Link>
    </div>
  );
}
