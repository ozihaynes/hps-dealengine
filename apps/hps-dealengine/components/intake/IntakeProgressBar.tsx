"use client";

import React from "react";

type IntakeProgressBarProps = {
  sections: { id: string; title: string }[];
  currentSectionIndex: number;
  onSectionClick?: (index: number) => void;
};

export function IntakeProgressBar({
  sections,
  currentSectionIndex,
  onSectionClick,
}: IntakeProgressBarProps) {
  return (
    <div className="mb-6">
      {/* Mobile: Simple progress bar */}
      <div className="block sm:hidden">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-white">
            Step {currentSectionIndex + 1} of {sections.length}
          </span>
          <span className="text-xs text-slate-400">
            {sections[currentSectionIndex]?.title}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700/40">
          <div
            className="h-full bg-sky-500 transition-all duration-300"
            style={{
              width: `${((currentSectionIndex + 1) / sections.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Desktop: Step indicators */}
      <div className="hidden sm:block">
        <div className="flex items-center justify-between">
          {sections.map((section, index) => {
            const isCompleted = index < currentSectionIndex;
            const isCurrent = index === currentSectionIndex;
            const isClickable = onSectionClick && index <= currentSectionIndex;

            return (
              <React.Fragment key={section.id}>
                {/* Step indicator */}
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onSectionClick(index)}
                  className={`
                    flex flex-col items-center gap-1 transition-all
                    ${isClickable ? "cursor-pointer" : "cursor-default"}
                    ${isCurrent || isCompleted ? "" : "opacity-50"}
                  `}
                >
                  <div
                    className={`
                      flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold
                      transition-all duration-200
                      ${
                        isCompleted
                          ? "bg-emerald-500/20 text-emerald-400"
                          : isCurrent
                            ? "bg-sky-500/20 text-sky-400 ring-2 ring-sky-500/50"
                            : "bg-slate-700/40 text-slate-500"
                      }
                    `}
                  >
                    {isCompleted ? (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={`
                      max-w-[80px] truncate text-center text-xs
                      ${
                        isCurrent
                          ? "font-medium text-white"
                          : "text-slate-500"
                      }
                    `}
                    title={section.title}
                  >
                    {section.title}
                  </span>
                </button>

                {/* Connector line */}
                {index < sections.length - 1 && (
                  <div
                    className={`
                      mx-2 h-0.5 flex-1
                      ${index < currentSectionIndex ? "bg-emerald-500/30" : "bg-slate-700/40"}
                    `}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default IntakeProgressBar;
