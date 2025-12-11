"use client";

import React from "react";
import { Crown, Handshake, ScanEye } from "lucide-react";

export type AgentId = "analyst" | "strategist" | "negotiator";

type AgentConfig = {
  name: string;
  role: string;
  icon: typeof ScanEye;
  gradient: string;
  textColor: string;
};

const AGENT_CONFIG: Record<AgentId, AgentConfig> = {
  analyst: {
    name: "The Analyst",
    role: "THE INTEL",
    icon: ScanEye,
    gradient: "from-[#0096FF] to-blue-600",
    textColor: "text-[#0096FF]",
  },
  strategist: {
    name: "The Strategist",
    role: "THE GENERAL",
    icon: Crown,
    gradient: "from-purple-600 to-amber-500",
    textColor: "text-purple-400",
  },
  negotiator: {
    name: "The Negotiator",
    role: "THE CLOSER",
    icon: Handshake,
    gradient: "from-[#FF4500] to-red-600",
    textColor: "text-[#FF4500]",
  },
};

export function AgentSessionHeader({ agentId }: { agentId: AgentId }) {
  const config = AGENT_CONFIG[agentId];

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)]/70 px-3 py-3">
      <div className={`rounded-lg bg-gradient-to-br ${config.gradient} p-3 shadow`}>
        <config.icon size={20} className="text-white" />
      </div>
      <div className="space-y-1">
        <div className="text-base font-bold text-text-primary">{config.name}</div>
        <div className={`text-[11px] font-bold uppercase tracking-[0.25em] ${config.textColor}`}>
          {config.role}
        </div>
      </div>
    </div>
  );
}

export default AgentSessionHeader;
