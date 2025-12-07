
import React from 'react';
import type { GlossaryKey } from "@/lib/glossary";
import { InfoTooltip } from "../ui/InfoTooltip";

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  helpKey?: GlossaryKey;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, helpKey }) => (
  <div className="card-icy">
    <div className="flex items-center gap-2 label-xs">
      {icon}
      <span className="flex items-center gap-1">
        <span>{label}</span>
        {helpKey ? <InfoTooltip helpKey={helpKey} /> : null}
      </span>
    </div>
    <div className="text-3xl font-bold text-text-primary font-mono metric-glow mt-2">{value}</div>
  </div>
);

export default StatCard;


