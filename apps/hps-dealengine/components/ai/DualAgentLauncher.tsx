"use client";

import React from "react";
import { useDealSession } from "@/lib/dealSessionContext";
import { useAiWindows } from "@/lib/ai/aiWindowsContext";
import DealAnalystWindow from "./DealAnalystWindow";
import DealStrategistWindow from "./DealStrategistWindow";

export function DualAgentLauncher() {
  const dealSession = useDealSession();
  const { state, dispatch } = useAiWindows();
  const analyst = state.windows.dealAnalyst;
  const strategist = state.windows.dealStrategist;

  const hasDeal = Boolean(dealSession?.dbDeal?.id);

  const toggleAnalyst = () => {
    if (!hasDeal) return;
    if (analyst.visibility === "closed") {
      dispatch({ type: "START_NEW_SESSION", id: "dealAnalyst", sessionId: crypto.randomUUID() });
      dispatch({ type: "OPEN_WINDOW", id: "dealAnalyst" });
    } else if (analyst.visibility === "minimized") {
      dispatch({ type: "OPEN_WINDOW", id: "dealAnalyst" });
    } else {
      dispatch({ type: "MINIMIZE_WINDOW", id: "dealAnalyst" });
    }
  };

  const toggleStrategist = () => {
    if (strategist.visibility === "closed") {
      dispatch({ type: "START_NEW_SESSION", id: "dealStrategist", sessionId: crypto.randomUUID() });
      dispatch({ type: "OPEN_WINDOW", id: "dealStrategist" });
    } else if (strategist.visibility === "minimized") {
      dispatch({ type: "OPEN_WINDOW", id: "dealStrategist" });
    } else {
      dispatch({ type: "MINIMIZE_WINDOW", id: "dealStrategist" });
    }
  };

  const analystActive = analyst.visibility !== "closed";
  const strategistActive = strategist.visibility !== "closed";

  return (
    <>
      {/* Desktop */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-40 hidden flex-col items-end gap-3 md:flex">
        <button
          type="button"
          onClick={toggleAnalyst}
          disabled={!hasDeal}
          title={
            hasDeal
              ? analyst.visibility === "open"
                ? "Minimize Deal Analyst"
                : "Open Deal Analyst"
              : "Open a deal and run Analyze to talk to the Deal Analyst"
          }
          className={`pointer-events-auto h-12 w-12 rounded-full border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] text-lg text-[color:var(--accent-color)] shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50 ${analystActive ? "ring-2 ring-[color:var(--accent-color)]/50" : ""}`}
        >
          ?
        </button>

        <button
          type="button"
          onClick={toggleStrategist}
          title={strategist.visibility === "open" ? "Minimize Deal Strategist" : "Open Deal Strategist"}
          className={`pointer-events-auto h-12 w-12 rounded-full border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] text-lg text-[color:var(--accent-color)] shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl ${strategistActive ? "ring-2 ring-[color:var(--accent-color)]/50" : ""}`}
        >
          💬
        </button>
      </div>

      {/* Mobile */}
      <div
        className="pointer-events-none fixed right-4 z-40 flex flex-col items-end gap-3 md:hidden"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 4.5rem)" }}
      >
        <button
          type="button"
          onClick={toggleAnalyst}
          disabled={!hasDeal}
          title={
            hasDeal
              ? analyst.visibility === "open"
                ? "Minimize Deal Analyst"
                : "Open Deal Analyst"
              : "Open a deal and run Analyze to talk to the Deal Analyst"
          }
          className={`pointer-events-auto h-12 w-12 rounded-full border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] text-lg text-[color:var(--accent-color)] shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50 ${analystActive ? "ring-2 ring-[color:var(--accent-color)]/50" : ""}`}
        >
          ?
        </button>

        <button
          type="button"
          onClick={toggleStrategist}
          title={strategist.visibility === "open" ? "Minimize Deal Strategist" : "Open Deal Strategist"}
          className={`pointer-events-auto h-12 w-12 rounded-full border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] text-lg text-[color:var(--accent-color)] shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl ${strategistActive ? "ring-2 ring-[color:var(--accent-color)]/50" : ""}`}
        >
          💬
        </button>
      </div>

      {/* Windows */}
      <DealAnalystWindow />
      <DealStrategistWindow />
    </>
  );
}

export default DualAgentLauncher;
