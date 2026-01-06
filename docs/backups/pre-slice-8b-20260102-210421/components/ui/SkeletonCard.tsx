import React from "react";

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`skeleton-metric-card ${className}`}>
      <div className="skeleton skeleton-text w-1/3" />
      <div className="skeleton skeleton-heading w-2/3" />
      <div className="skeleton-row">
        <div className="skeleton skeleton-text flex-1" />
        <div className="skeleton skeleton-text flex-1" />
      </div>
      <div className="skeleton skeleton-card w-full h-24" />
    </div>
  );
};
