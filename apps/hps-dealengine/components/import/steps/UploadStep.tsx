"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloudIcon, FileIcon, AlertCircleIcon } from "lucide-react";
import {
  validateFile,
  FILE_LIMITS,
  formatFileSize,
} from "@/lib/import/sanitization";

interface UploadStepProps {
  file: File | null;
  parseError: string | null;
  isProcessing: boolean;
  processingPhase: string | null;
  onFileSelect: (file: File | null) => Promise<void>;
  onCancel?: () => void;
}

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls", ".json"];

export function UploadStep({
  file,
  parseError,
  isProcessing,
  processingPhase,
  onFileSelect,
  onCancel,
}: UploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate and select file
  const validateAndSelect = useCallback(
    (selectedFile: File) => {
      setValidationError(null);

      // Validate file
      const validation = validateFile(selectedFile);
      if (!validation.valid) {
        setValidationError(validation.error || "Invalid file");
        return;
      }

      // Pass to parent for processing
      onFileSelect(selectedFile);
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        validateAndSelect(droppedFile);
      }
    },
    [validateAndSelect]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        validateAndSelect(selectedFile);
      }
    },
    [validateAndSelect]
  );

  const handleClearFile = useCallback(() => {
    setValidationError(null);
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [onFileSelect]);

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!isProcessing && (e.key === "Enter" || e.key === " ")) {
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload file area. Click or drag and drop to upload."
        className={`
          relative flex flex-col items-center justify-center
          w-full min-h-[300px] p-8
          border-2 border-dashed rounded-xl
          transition-all duration-200 cursor-pointer
          ${
            isDragging
              ? "border-blue-500 bg-blue-500/10"
              : "border-slate-600 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800"
          }
          ${isProcessing ? "pointer-events-none opacity-70" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={handleFileChange}
          className="hidden"
          disabled={isProcessing}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white font-medium">
              {processingPhase || "Processing..."}
            </p>
          </div>
        ) : file ? (
          <div className="flex flex-col items-center text-center">
            <FileIcon className="w-12 h-12 mb-4 text-blue-400" />
            <p className="text-white font-medium mb-1">{file.name}</p>
            <p className="text-slate-400 text-sm">{formatFileSize(file.size)}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClearFile();
              }}
              className="mt-4 px-4 py-2 text-sm text-slate-300 hover:text-white
                         bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              Choose different file
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <UploadCloudIcon className="w-16 h-16 mb-4 text-slate-500" />
            <p className="text-white font-medium mb-2">
              Drag and drop your file here
            </p>
            <p className="text-slate-400 text-sm mb-4">or click to browse</p>
            <p className="text-slate-500 text-xs">
              Supported: CSV, Excel, JSON | Max {FILE_LIMITS.MAX_SIZE_MB}MB | Max{" "}
              {FILE_LIMITS.MAX_ROWS.toLocaleString()} rows
            </p>
          </div>
        )}
      </div>

      {/* Validation Error */}
      {validationError && (
        <div
          className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
          role="alert"
        >
          <AlertCircleIcon
            className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <p className="text-red-400 font-medium">Invalid file</p>
            <p className="text-red-300/80 text-sm mt-1">{validationError}</p>
          </div>
        </div>
      )}

      {/* Parse Error */}
      {parseError && (
        <div
          className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
          role="alert"
        >
          <AlertCircleIcon
            className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <p className="text-red-400 font-medium">Failed to parse file</p>
            <p className="text-red-300/80 text-sm mt-1">{parseError}</p>
          </div>
        </div>
      )}

      {/* Cancel Button */}
      {onCancel && (
        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
