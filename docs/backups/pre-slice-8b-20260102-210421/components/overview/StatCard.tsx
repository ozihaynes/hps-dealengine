
import React from 'react';
import type { GlossaryKey } from "@/lib/glossary";
import { InfoTooltip } from "../ui/InfoTooltip";
import { AnimatedNumber } from "../ui/AnimatedNumber";

interface StatCardProps {
  label: string;
  value: number | null | undefined;
  icon: React.ReactNode;
  helpKey?: GlossaryKey;
  prefix?: string;
  suffix?: string;
  format?: (n: number) => string;
  placeholder?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  helpKey,
  prefix,
  suffix,
  format,
  placeholder = "-",
}) => {
  const hasValue = typeof value === "number" && Number.isFinite(value);

  return (
    <div className="card-primary card-padding-md hover-lift">
      <div className="flex items-center gap-2 label-xs">
        {icon}
        <span className="flex items-center gap-1">
          <span>{label}</span>
          {helpKey ? <InfoTooltip helpKey={helpKey} /> : null}
        </span>
      </div>
      <div className="text-metric text-text-primary font-mono metric-glow mt-2">
        {hasValue ? (
          <AnimatedNumber value={value as number} prefix={prefix} suffix={suffix} format={format} />
        ) : (
          <span className="text-muted">{placeholder}</span>
        )}
      </div>
    </div>
  );
};

export default StatCard;
