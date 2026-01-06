"use client";

import { useImportWizard, type WizardStep } from "@/hooks/useImportWizard";
import { UploadStep } from "./steps/UploadStep";
import { TypeStep } from "./steps/TypeStep";
import { MappingStep } from "./steps/MappingStep";
import { ValidateStep } from "./steps/ValidateStep";
import { CommitStep } from "./steps/CommitStep";
import { ImportProgressBar } from "./ImportProgressBar";
import type { SourceRoute } from "@hps-internal/contracts";

// =============================================================================
// TYPES
// =============================================================================

interface ImportWizardProps {
  sourceRoute?: SourceRoute;
  onComplete?: (jobId: string) => void;
  onCancel?: () => void;
}

const STEP_CONFIG: Record<WizardStep, { title: string; description: string }> = {
  upload: {
    title: "Upload File",
    description: "Select a CSV, Excel, or JSON file to import",
  },
  type: {
    title: "Confirm Type",
    description: "Verify the file type was detected correctly",
  },
  mapping: {
    title: "Map Columns",
    description: "Match your file columns to deal fields",
  },
  validate: {
    title: "Review Data",
    description: "Check for errors before importing",
  },
  commit: {
    title: "Import",
    description: "Upload and process your data",
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ImportWizard({
  sourceRoute = "import",
  onComplete,
  onCancel,
}: ImportWizardProps) {
  const [state, actions] = useImportWizard(sourceRoute);
  const stepConfig = STEP_CONFIG[state.currentStep];

  return (
    <div className="flex flex-col min-h-[600px] max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-2">Import Deals</h1>
        <p className="text-slate-400">{stepConfig.description}</p>
      </div>

      {/* Progress Bar */}
      <ImportProgressBar
        currentStep={state.currentStep}
        canGoToStep={actions.canGoToStep}
        onStepClick={actions.goToStep}
      />

      {/* Step Content */}
      <div className="flex-1 mt-6">
        {state.currentStep === "upload" && (
          <UploadStep
            file={state.file}
            parseError={state.parseError}
            isProcessing={state.isProcessing}
            processingPhase={state.processingPhase}
            onFileSelect={actions.setFile}
            onCancel={onCancel}
          />
        )}

        {state.currentStep === "type" && (
          <TypeStep
            file={state.file}
            fileType={state.fileType}
            parsedFile={state.parsedFile}
            onFileTypeChange={actions.setFileType}
            onNext={actions.nextStep}
            onBack={actions.prevStep}
          />
        )}

        {state.currentStep === "mapping" && (
          <MappingStep
            parsedFile={state.parsedFile}
            columnMapping={state.columnMapping}
            mappingComplete={state.mappingComplete}
            onMappingChange={actions.setColumnMapping}
            onResetMapping={actions.resetMapping}
            onNext={actions.processRows}
            onBack={actions.prevStep}
            isProcessing={state.isProcessing}
            processingPhase={state.processingPhase}
          />
        )}

        {state.currentStep === "validate" && (
          <ValidateStep
            parsedFile={state.parsedFile}
            normalizedRows={state.normalizedRows}
            validationResult={state.validationResult}
            columnMapping={state.columnMapping}
            onNext={actions.nextStep}
            onBack={actions.prevStep}
          />
        )}

        {state.currentStep === "commit" && (
          <CommitStep
            file={state.file}
            fileHash={state.fileHash}
            fileType={state.fileType}
            parsedFile={state.parsedFile}
            normalizedRows={state.normalizedRows}
            validationResult={state.validationResult}
            columnMapping={state.columnMapping}
            sourceRoute={sourceRoute}
            onComplete={onComplete}
            onBack={actions.prevStep}
          />
        )}
      </div>
    </div>
  );
}
