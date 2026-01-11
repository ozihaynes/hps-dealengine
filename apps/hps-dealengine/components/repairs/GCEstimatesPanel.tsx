// ============================================================================
// GC ESTIMATES PANEL — Horizontal Gallery Container
// ============================================================================
// Principles Applied:
// - uiux-art-director: Gallery layout with scroll indicators
// - responsive-design-specialist: Touch-friendly horizontal scroll
// - accessibility-champion: Keyboard navigation, focus management
// ============================================================================

"use client";

import { memo, useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { GCEstimateCard } from "./GCEstimateCard";
import { EstimateStatus } from "./StatusBadge";
import { card, focus } from "./designTokens";

// ============================================================================
// TYPES
// ============================================================================

interface EstimateRequest {
  id: string;
  gc_name: string;
  gc_email?: string;
  status: EstimateStatus;
  submitted_at?: string;
  sent_at?: string;
  file_path?: string;
}

interface GCEstimatesPanelProps {
  estimates: EstimateRequest[];
  onViewEstimate?: (id: string, filePath: string) => void;
  onDownloadEstimate?: (id: string, filePath: string) => void;
  isDemoMode?: boolean;
  className?: string;
}

// ============================================================================
// SCROLL BUTTON COMPONENT
// ============================================================================

interface ScrollButtonProps {
  direction: "left" | "right";
  onClick: () => void;
  disabled: boolean;
}

const ScrollButton = memo(function ScrollButton({
  direction,
  onClick,
  disabled,
}: ScrollButtonProps) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={`Scroll ${direction}`}
      className={`
        absolute ${direction === "left" ? "left-0" : "right-0"} top-1/2 -translate-y-1/2
        z-10
        w-11 h-11 min-w-[44px] min-h-[44px]
        flex items-center justify-center
        bg-slate-800/90 backdrop-blur-sm
        border border-slate-700
        rounded-full
        text-slate-300 hover:text-white
        transition-all duration-150
        disabled:opacity-0 disabled:pointer-events-none
        hover:bg-slate-700 hover:border-slate-600
        ${focus.className}
      `}
    >
      <Icon size={20} />
    </button>
  );
});

// ============================================================================
// COMPONENT
// ============================================================================

export const GCEstimatesPanel = memo(function GCEstimatesPanel({
  estimates,
  onViewEstimate,
  onDownloadEstimate,
  isDemoMode = false,
  className = "",
}: GCEstimatesPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll position
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, estimates.length]);

  // Scroll handlers
  const scroll = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;

    const cardWidth = 216; // 200px card + 16px gap
    const scrollAmount = direction === "left" ? -cardWidth * 2 : cardWidth * 2;

    el.scrollBy({ left: scrollAmount, behavior: "smooth" });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // KEYBOARD NAVIGATION
  // Principle: POUR-Operable — fully keyboard accessible
  // ═══════════════════════════════════════════════════════════════════════
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const el = scrollRef.current;
      if (!el) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          scroll("left");
          break;
        case "ArrowRight":
          e.preventDefault();
          scroll("right");
          break;
        case "Home":
          e.preventDefault();
          el.scrollTo({ left: 0, behavior: "smooth" });
          break;
        case "End":
          e.preventDefault();
          el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
          break;
      }
    },
    [scroll]
  );

  // Empty state
  if (estimates.length === 0) {
    return (
      <div
        className={`
          ${card.base}
          ${card.padding}
          flex flex-col items-center justify-center
          min-h-[180px]
          ${className}
        `}
      >
        <Users className="w-10 h-10 text-slate-600 mb-3" />
        <p className="text-sm text-slate-400 text-center">
          No estimates requested yet
        </p>
        <p className="text-xs text-slate-500 text-center mt-1">
          Request estimates from contractors to compare bids
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2, ease: [0, 0, 0.2, 1] }}
      className={`
        ${card.base}
        p-4
        relative
        ${isDemoMode ? "border-dashed" : ""}
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-medium text-slate-300">
            Contractor Estimates
            <span className="sr-only"> - Use arrow keys to navigate</span>
          </h3>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
            {estimates.length}
          </span>
        </div>

        {/* Visual keyboard hint - desktop only */}
        {estimates.length > 2 && (
          <span
            className="hidden md:flex items-center gap-1.5 text-xs text-slate-500"
            aria-hidden="true"
          >
            <kbd className="inline-flex items-center justify-center w-6 h-5 bg-slate-800 rounded text-slate-400">
              <ChevronLeft size={12} />
            </kbd>
            <kbd className="inline-flex items-center justify-center w-6 h-5 bg-slate-800 rounded text-slate-400">
              <ChevronRight size={12} />
            </kbd>
            <span>to scroll</span>
          </span>
        )}

        {isDemoMode && (
          <span className="text-xs font-medium text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
            Demo
          </span>
        )}
      </div>

      {/* Scroll Container */}
      <div className="relative">
        {/* Left gradient fade */}
        <div
          className={`
            absolute left-0 top-0 bottom-0 w-8 z-10
            bg-gradient-to-r from-slate-900/80 to-transparent
            pointer-events-none
            transition-opacity duration-200
            ${canScrollLeft ? "opacity-100" : "opacity-0"}
          `}
        />

        {/* Right gradient fade */}
        <div
          className={`
            absolute right-0 top-0 bottom-0 w-8 z-10
            bg-gradient-to-l from-slate-900/80 to-transparent
            pointer-events-none
            transition-opacity duration-200
            ${canScrollRight ? "opacity-100" : "opacity-0"}
          `}
        />

        {/* Scroll Buttons (Desktop) */}
        <div className="hidden md:block">
          <ScrollButton
            direction="left"
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
          />
          <ScrollButton
            direction="right"
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
          />
        </div>

        {/* Scrollable Gallery */}
        <div
          ref={scrollRef}
          role="region"
          aria-label="Contractor estimates gallery. Use left and right arrow keys to scroll, Home and End to jump to start or end."
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className={`
            flex gap-4
            overflow-x-auto
            scroll-smooth
            snap-x snap-mandatory
            pb-2
            focus-visible:ring-2 focus-visible:ring-emerald-500
            focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
            rounded-lg
            -mb-2
            ${focus.className}
          `}
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#475569 transparent",
          }}
        >
          {estimates.map((estimate, index) => (
            <motion.div
              key={estimate.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.2,
                delay: 0.25 + index * 0.05,
                ease: [0, 0, 0.2, 1],
              }}
              className="snap-start"
            >
              <GCEstimateCard
                id={estimate.id}
                gcName={estimate.gc_name}
                gcEmail={estimate.gc_email}
                status={estimate.status}
                submittedAt={estimate.submitted_at}
                sentAt={estimate.sent_at}
                filePath={estimate.file_path}
                onView={() =>
                  onViewEstimate?.(estimate.id, estimate.file_path || "")
                }
                onDownload={() =>
                  onDownloadEstimate?.(estimate.id, estimate.file_path || "")
                }
                isDemoMode={isDemoMode}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
});

export default GCEstimatesPanel;
