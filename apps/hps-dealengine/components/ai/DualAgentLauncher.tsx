"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, Crown, Handshake, ScanEye } from "lucide-react";
import { useDealSession } from "@/lib/dealSessionContext";
import { useAiWindows } from "@/lib/ai/aiWindowsContext";
import DealAnalystWindow from "./DealAnalystWindow";
import DealStrategistWindow from "./DealStrategistWindow";
import DealNegotiatorWindow from "./DealNegotiatorWindow";

type AgentId = "analyst" | "strategist" | "negotiator";
type WindowId = "dealAnalyst" | "dealStrategist" | "dealNegotiator";

type AgentConfig = {
  id: AgentId;
  windowId: WindowId;
  name: string;
  role: string;
  icon: typeof ScanEye;
  gradient: string;
  textColor: string;
  requiresDeal?: boolean;
};

const AGENTS: AgentConfig[] = [
  {
    id: "analyst",
    windowId: "dealAnalyst",
    name: "The Analyst",
    role: "THE INTEL",
    icon: ScanEye,
    gradient: "from-[#0096FF] to-blue-600",
    textColor: "text-[#0096FF]",
    requiresDeal: true,
  },
  {
    id: "strategist",
    windowId: "dealStrategist",
    name: "The Strategist",
    role: "THE GENERAL",
    icon: Crown,
    gradient: "from-purple-600 to-amber-500",
    textColor: "text-purple-400",
  },
  {
    id: "negotiator",
    windowId: "dealNegotiator",
    name: "The Negotiator",
    role: "THE CLOSER",
    icon: Handshake,
    gradient: "from-[#FF4500] to-red-600",
    textColor: "text-[#FF4500]",
    requiresDeal: true,
  },
];

export function DualAgentLauncher() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [mobileHidden, setMobileHidden] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const dealSession = useDealSession();
  const { state, dispatch } = useAiWindows();

  const hasDeal = Boolean(dealSession?.dbDeal?.id);
  const canUseNegotiator = useMemo(
    () => Boolean(dealSession?.negotiationPlaybook && dealSession.negotiationPlaybook.logicRowIds.length > 0),
    [dealSession?.negotiationPlaybook],
  );

  const handleToggle = (agent: AgentConfig) => {
    const windowState = state.windows[agent.windowId];
    const blockedByDeal = agent.requiresDeal && !hasDeal;
    if (blockedByDeal) return;

    if (windowState.visibility === "closed" || !windowState.activeSessionId) {
      dispatch({
        type: "START_NEW_SESSION",
        id: agent.windowId,
        sessionId: crypto.randomUUID(),
        context: {
          dealId: dealSession?.dbDeal?.id,
          orgId: dealSession?.dbDeal?.org_id,
          runId: dealSession?.lastRunId ?? undefined,
          posture: dealSession?.posture,
        },
      });
      dispatch({ type: "OPEN_WINDOW", id: agent.windowId });
      return;
    }

    if (windowState.visibility === "minimized") {
      dispatch({ type: "OPEN_WINDOW", id: agent.windowId });
      return;
    }

    dispatch({ type: "MINIMIZE_WINDOW", id: agent.windowId });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent, intent: "hide" | "show") => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const threshold = 30;
    if (intent === "hide" && deltaX > threshold) {
      setMobileHidden(true);
      setIsExpanded(false);
    }
    if (intent === "show" && deltaX < -threshold) {
      setMobileHidden(false);
    }
    setTouchStartX(null);
  };

  return (
    <>
      <div className="pointer-events-none fixed bottom-8 right-8 z-[95] flex flex-col items-end space-y-4">
        <div
          className={`pointer-events-auto transition-all duration-300 ${
            mobileHidden ? "translate-x-24 opacity-0 md:translate-x-0 md:opacity-100" : "translate-x-0 opacity-100"
          }`}
          onTouchStart={handleTouchStart}
          onTouchEnd={(e) => handleTouchEnd(e, "hide")}
        >
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="relative inline-flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-transparent p-0 shadow-none transition-transform hover:scale-[1.02] focus:outline-none"
          >
            <Image
              src="/agents-mascot.png"
              alt=""
              width={192}
              height={192}
              className="h-full w-full object-contain"
              priority
            />
          </button>
        </div>

        {mobileHidden ? (
          <button
            type="button"
            className="pointer-events-auto relative inline-flex h-10 w-10 items-center justify-center bg-transparent p-0 shadow-none transition-transform hover:scale-[1.03] md:hidden"
            onClick={() => setMobileHidden(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={(e) => handleTouchEnd(e, "show")}
          >
            <span
              className="arrow-indicator block h-full w-full"
              style={{
                WebkitMaskImage: 'url("/ChatGPT Image Dec 11, 2025, 06_58_16 AM.png")',
                maskImage: 'url("/ChatGPT Image Dec 11, 2025, 06_58_16 AM.png")',
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskPosition: "center",
                maskPosition: "center",
                backgroundColor: "#60c9ff",
              }}
            />
          </button>
        ) : null}

        <div
          className={`flex flex-col space-y-4 transition-all duration-300 ${
            isExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
          }`}
        >
          {AGENTS.map((agent) => {
            const windowState = state.windows[agent.windowId];
            const isOpen = windowState.visibility !== "closed";
            const isDisabled = agent.requiresDeal && !hasDeal;

            return (
              <div key={agent.id} className="relative group flex items-center justify-end pointer-events-auto">
                <div
                  className={`absolute right-16 px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 shadow-xl transition-all duration-300 origin-right opacity-0 scale-90 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-100`}
                >
                  <p className={`text-xs font-bold uppercase tracking-widest ${agent.textColor}`}>{agent.role}</p>
                  <p className="font-semibold whitespace-nowrap">{agent.name}</p>
                </div>

                <button
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleToggle(agent)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 border-2 ${
                    isOpen
                      ? "scale-110 border-white ring-4 ring-white/20"
                      : "border-slate-700 hover:scale-110 hover:border-slate-500"
                  } bg-gradient-to-br ${agent.gradient} ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  title={
                    isDisabled
                      ? "Open a deal and run Analyze to unlock this agent"
                      : isOpen
                        ? "Minimize"
                        : "Open"
                  }
                >
                  <agent.icon size={24} className="text-white drop-shadow-md" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <DealAnalystWindow />
      <DealStrategistWindow />
      <DealNegotiatorWindow />
      <style jsx>{`
        @keyframes agent-glow-spin {
          0% {
            --angle: 0deg;
          }
          100% {
            --angle: 360deg;
          }
        }
        .agent-glow-ring::before {
          content: "";
          position: absolute;
          inset: -4px;
          padding: 4px;
          border-radius: 9999px;
          --angle: 0deg;
          background: conic-gradient(
            from var(--angle) at 50% 50%,
            transparent 0deg 260deg,
            rgba(0, 150, 255, 1) 260deg 320deg,
            transparent 320deg 360deg
          );
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask-composite: exclude;
          -webkit-mask-composite: destination-out;
          animation: agent-glow-spin 1.6s linear infinite;
          opacity: 1;
          box-shadow: 0 0 16px rgba(0, 150, 255, 0.6);
        }
        .arrow-indicator {
          background: linear-gradient(90deg, #8ee2ff 0%, #32c3ff 50%, #8ee2ff 100%);
          background-size: 200% 100%;
          animation: arrow-glow 1.2s linear infinite;
        }
        @keyframes arrow-glow {
          0% {
            background-position: 100% 0;
          }
          100% {
            background-position: 0 0;
          }
        }
      `}</style>
    </>
  );
}

export default DualAgentLauncher;
