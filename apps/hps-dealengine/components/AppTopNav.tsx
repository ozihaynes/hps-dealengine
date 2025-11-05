"use client";

import React from "react";

/** Minimal top nav that dispatches a global analyze event */
export default function AppTopNav() {
  const onAnalyze = () => {
    // Standard browser CustomEvent dispatch; listeners react in-page.
    window.dispatchEvent(new CustomEvent("hps:analyze-now"));
  };

  return (
    <div className="w-full flex items-center justify-between px-4 py-2 text-sm">
      <div className="font-semibold tracking-wide">HPS DealEngine</div>
      <button
        onClick={onAnalyze}
        className="rounded-md border border-white/20 px-3 py-1 hover:bg-white/10"
        aria-label="Analyze with AI"
        title="Analyze with AI"
      >
        Analyze with AI
      </button>
    </div>
  );
}