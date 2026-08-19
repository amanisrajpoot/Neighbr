"use client";

import React from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <h2 className="text-3xl font-extrabold text-slate-900">Application Error</h2>
      <p className="text-sm text-slate-500 max-w-md">
        An error occurred in the administration dashboard: {error?.message || "Unknown error"}
      </p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-md shadow-sky-600/20"
      >
        Try Again
      </button>
    </div>
  );
}
