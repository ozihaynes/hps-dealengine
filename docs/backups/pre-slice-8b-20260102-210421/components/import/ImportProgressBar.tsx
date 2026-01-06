"use client";

import { type WizardStep } from "@/hooks/useImportWizard";
import { CheckIcon } from "lucide-react";

interface ImportProgressBarProps {
  currentStep: WizardStep;
  canGoToStep: (step: WizardStep) => boolean;
  onStepClick: (step: WizardStep) => void;
}

const STEPS: { key: WizardStep; label: string; shortLabel: string }[] = [
  { key: "upload", label: "Upload", shortLabel: "1" },
  { key: "type", label: "Type", shortLabel: "2" },
  { key: "mapping", label: "Mapping", shortLabel: "3" },
  { key: "validate", label: "Validate", shortLabel: "4" },
  { key: "commit", label: "Import", shortLabel: "5" },
];

export function ImportProgressBar({
  currentStep,
  canGoToStep,
  onStepClick,
}: ImportProgressBarProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-between">
      {STEPS.map((step, index) => {
        const isActive = step.key === currentStep;
        const isCompleted = index < currentIndex;
        const isClickable = canGoToStep(step.key);

        return (
          <div key={step.key} className="flex items-center flex-1">
            {/* Step Circle */}
            <button
              onClick={() => isClickable && onStepClick(step.key)}
              disabled={!isClickable}
              className={`
                relative flex items-center justify-center w-10 h-10 rounded-full
                font-medium text-sm transition-all duration-200
                ${
                  isActive
                    ? "bg-blue-500 text-white ring-4 ring-blue-500/30"
                    : isCompleted
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-700 text-slate-400"
                }
                ${isClickable && !isActive ? "cursor-pointer hover:ring-2 hover:ring-slate-500" : ""}
                ${!isClickable ? "cursor-not-allowed opacity-60" : ""}
              `}
            >
              {isCompleted ? (
                <CheckIcon className="w-5 h-5" />
              ) : (
                <span>{index + 1}</span>
              )}
            </button>

            {/* Step Label (hidden on mobile) */}
            <span
              className={`
                hidden sm:block ml-3 text-sm font-medium
                ${isActive ? "text-white" : isCompleted ? "text-emerald-400" : "text-slate-500"}
              `}
            >
              {step.label}
            </span>

            {/* Connector Line */}
            {index < STEPS.length - 1 && (
              <div
                className={`
                  flex-1 h-0.5 mx-4
                  ${index < currentIndex ? "bg-emerald-500" : "bg-slate-700"}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
