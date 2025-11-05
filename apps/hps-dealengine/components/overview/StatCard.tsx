import React from 'react';

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon }) => (
  <div className="card-icy">
    <div className="flex items-center gap-2 label-xs">
      {icon}
      <span>{label}</span>
    </div>
    <div className="text-3xl font-bold text-text-primary font-mono metric-glow mt-2">{value}</div>
  </div>
);

export default StatCard;
