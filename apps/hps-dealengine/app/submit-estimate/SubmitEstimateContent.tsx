"use client";

// ============================================================================
// SUBMIT ESTIMATE CONTENT COMPONENT
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Loader2,
  AlertTriangle,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

type PageState =
  | "loading"
  | "valid"
  | "invalid"
  | "expired"
  | "submitted"
  | "cancelled"
  | "uploading"
  | "success"
  | "error";

interface RequestInfo {
  id: string;
  gc_name: string;
  property_address: string;
  expires_at: string;
  status: string;
}

interface ValidationResponse {
  valid: boolean;
  request?: RequestInfo;
  expired?: boolean;
  submitted?: boolean;
  cancelled?: boolean;
  error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_EXTENSIONS = ".pdf,.jpg,.jpeg,.png,.webp";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SubmitEstimateContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [pageState, setPageState] = useState<PageState>("loading");
  const [requestInfo, setRequestInfo] = useState<RequestInfo | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  // ==========================================================================
  // TOKEN VALIDATION
  // ==========================================================================

  useEffect(() => {
    if (!token) {
      setPageState("invalid");
      return;
    }
    validateToken(token);
  }, [token]);

  async function validateToken(t: string) {
    try {
      const res = await fetch(
        `/api/validate-estimate-token?token=${encodeURIComponent(t)}`
      );
      const data: ValidationResponse = await res.json();

      if (!data.valid) {
        if (data.expired) setPageState("expired");
        else if (data.submitted) setPageState("submitted");
        else if (data.cancelled) setPageState("cancelled");
        else setPageState("invalid");
        return;
      }

      if (data.request) {
        setRequestInfo(data.request);
        setPageState("valid");

        // Fire-and-forget: mark as viewed
        fetch("/api/mark-estimate-viewed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: t }),
        }).catch(() => {
          // Ignore errors - this is a best-effort tracking call
        });
      } else {
        setPageState("invalid");
      }
    } catch {
      setPageState("invalid");
    }
  }

  // ==========================================================================
  // FILE HANDLING
  // ==========================================================================

  const isValidFile = useCallback((f: File): boolean => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      setErrorMessage(
        "Invalid file type. Please upload PDF, JPG, PNG, or WebP."
      );
      return false;
    }
    if (f.size > MAX_FILE_SIZE) {
      setErrorMessage("File too large. Maximum size is 10MB.");
      return false;
    }
    if (f.size === 0) {
      setErrorMessage("File appears to be empty.");
      return false;
    }
    return true;
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const f = e.dataTransfer.files[0];
      if (f && isValidFile(f)) {
        setFile(f);
        setErrorMessage("");
      }
    },
    [isValidFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f && isValidFile(f)) {
        setFile(f);
        setErrorMessage("");
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [isValidFile]
  );

  const clearFile = useCallback(() => {
    setFile(null);
    setErrorMessage("");
  }, []);

  // ==========================================================================
  // FORM SUBMISSION
  // ==========================================================================

  async function handleSubmit() {
    if (!file || !token) return;

    setPageState("uploading");
    setUploadProgress(10);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("token", token);
      formData.append("file", file);
      if (notes.trim()) {
        formData.append("gc_notes", notes.trim());
      }

      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + 10, 90));
      }, 200);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error("Configuration error. Please try again later.");
      }
      const res = await fetch(
        `${supabaseUrl}/functions/v1/v1-estimate-submit`,
        {
          method: "POST",
          body: formData,
        }
      );

      clearInterval(interval);
      setUploadProgress(100);

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setPageState("success");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Upload failed. Please try again."
      );
      setPageState("error");
    }
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-emerald-400">HPS DealEngine</h1>
          <p className="text-slate-400 mt-1">Repair Estimate Submission</p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
          <AnimatePresence mode="wait">
            {pageState === "loading" && (
              <StateCard
                key="loading"
                icon={Loader2}
                iconClass="animate-spin text-emerald-400"
                title="Validating link..."
              />
            )}

            {pageState === "invalid" && (
              <StateCard
                key="invalid"
                icon={XCircle}
                iconClass="text-red-400"
                title="Invalid Link"
                description="This submission link is invalid. Please contact the requestor for a new link."
              />
            )}

            {pageState === "expired" && (
              <StateCard
                key="expired"
                icon={Clock}
                iconClass="text-amber-400"
                title="Link Expired"
                description="This submission link has expired. Please contact the requestor for a new link."
              />
            )}

            {pageState === "submitted" && (
              <StateCard
                key="submitted"
                icon={CheckCircle}
                iconClass="text-emerald-400"
                title="Already Submitted"
                description="An estimate has already been submitted for this request."
              />
            )}

            {pageState === "cancelled" && (
              <StateCard
                key="cancelled"
                icon={XCircle}
                iconClass="text-slate-400"
                title="Request Cancelled"
                description="This estimate request has been cancelled."
              />
            )}

            {pageState === "success" && (
              <StateCard
                key="success"
                icon={CheckCircle}
                iconClass="text-emerald-400"
                title="Estimate Submitted!"
                description="Thank you! Your estimate has been received."
              />
            )}

            {pageState === "error" && (
              <StateCard
                key="error"
                icon={AlertTriangle}
                iconClass="text-red-400"
                title="Upload Failed"
                description={errorMessage}
                action={() => setPageState("valid")}
                actionLabel="Try Again"
              />
            )}

            {pageState === "uploading" && (
              <UploadingState key="uploading" progress={uploadProgress} />
            )}

            {pageState === "valid" && requestInfo && (
              <UploadForm
                key="form"
                requestInfo={requestInfo}
                file={file}
                onFileSelect={handleFileSelect}
                onFileDrop={handleDrop}
                onFileClear={clearFile}
                notes={notes}
                onNotesChange={setNotes}
                isDragOver={isDragOver}
                setIsDragOver={setIsDragOver}
                onSubmit={handleSubmit}
                errorMessage={errorMessage}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-6">
          Powered by HPS DealEngine
        </p>
      </motion.div>
    </div>
  );
}

// ============================================================================
// STATE CARD COMPONENT
// ============================================================================

interface StateCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  title: string;
  description?: string;
  action?: () => void;
  actionLabel?: string;
}

function StateCard({
  icon: Icon,
  iconClass,
  title,
  description,
  action,
  actionLabel,
}: StateCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-12 text-center"
    >
      <Icon className={`w-16 h-16 mx-auto ${iconClass}`} aria-hidden="true" />
      <h2 className="text-xl font-semibold text-white mt-4">{title}</h2>
      {description && (
        <p className="text-slate-400 mt-2 max-w-sm mx-auto">{description}</p>
      )}
      {action && actionLabel && (
        <button
          onClick={action}
          className="mt-6 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}

// ============================================================================
// UPLOADING STATE COMPONENT
// ============================================================================

function UploadingState({ progress }: { progress: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-12 text-center"
    >
      <Loader2
        className="w-12 h-12 text-emerald-400 animate-spin mx-auto"
        aria-hidden="true"
      />
      <p className="text-white mt-4">Uploading your estimate...</p>
      <div
        className="mt-4 w-full bg-slate-800 rounded-full h-2 overflow-hidden"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className="bg-emerald-500 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <p className="text-slate-500 text-sm mt-2">{progress}%</p>
    </motion.div>
  );
}

// ============================================================================
// UPLOAD FORM COMPONENT
// ============================================================================

interface UploadFormProps {
  requestInfo: RequestInfo;
  file: File | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileDrop: (e: React.DragEvent) => void;
  onFileClear: () => void;
  notes: string;
  onNotesChange: (value: string) => void;
  isDragOver: boolean;
  setIsDragOver: (value: boolean) => void;
  onSubmit: () => void;
  errorMessage: string;
}

function UploadForm({
  requestInfo,
  file,
  onFileSelect,
  onFileDrop,
  onFileClear,
  notes,
  onNotesChange,
  isDragOver,
  setIsDragOver,
  onSubmit,
  errorMessage,
}: UploadFormProps) {
  const fileInputId = "estimate-file-input";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-8"
    >
      {/* Property Info */}
      <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700">
        <p className="text-xs text-emerald-400 uppercase tracking-wide mb-1 font-medium">
          Property
        </p>
        <p className="text-white font-medium">{requestInfo.property_address}</p>
      </div>

      {/* Greeting */}
      <p className="text-slate-300 mb-6">
        Hi <span className="text-white font-medium">{requestInfo.gc_name}</span>
        , please upload your repair estimate below.
      </p>

      {/* Drop Zone */}
      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onFileDrop}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            document.getElementById(fileInputId)?.click();
          }
        }}
        aria-label="File upload area. Press Enter to browse files."
        className={`
          border-2 border-dashed rounded-xl p-8 text-center transition-all
          ${
            isDragOver
              ? "border-emerald-400 bg-emerald-400/10"
              : file
                ? "border-emerald-600 bg-emerald-900/20"
                : "border-slate-700 hover:border-slate-600"
          }
        `}
      >
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText
              className="w-8 h-8 text-emerald-400 shrink-0"
              aria-hidden="true"
            />
            <div className="text-left min-w-0">
              <p className="text-white truncate">{file.name}</p>
              <p className="text-slate-400 text-sm">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={onFileClear}
              className="p-1 text-slate-400 hover:text-red-400 transition-colors"
              aria-label="Remove file"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <>
            <Upload
              className="w-12 h-12 text-slate-500 mx-auto mb-3"
              aria-hidden="true"
            />
            <p className="text-slate-300 mb-2">Drag & drop your file here</p>
            <p className="text-slate-500 text-sm mb-4">or</p>
            <label
              htmlFor={fileInputId}
              className="inline-block px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg cursor-pointer transition-colors"
            >
              Browse Files
              <input
                id={fileInputId}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={onFileSelect}
                className="sr-only"
              />
            </label>
            <p className="text-slate-600 text-xs mt-4">
              PDF, JPG, PNG, or WebP - Max 10MB
            </p>
          </>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <p className="text-red-400 text-sm mt-3" role="alert">
          {errorMessage}
        </p>
      )}

      {/* Notes */}
      <div className="mt-6">
        <label htmlFor="gc-notes" className="block text-sm text-slate-400 mb-2">
          Notes (optional)
        </label>
        <textarea
          id="gc-notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Any additional notes about your estimate..."
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        <p className="text-slate-600 text-xs mt-1 text-right">
          {notes.length}/2000
        </p>
      </div>

      {/* Submit Button */}
      <button
        onClick={onSubmit}
        disabled={!file}
        aria-disabled={!file}
        className={`
          w-full mt-6 py-4 rounded-xl font-semibold text-lg transition-all
          min-h-14
          ${
            file
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
              : "bg-slate-700 text-slate-400 cursor-not-allowed"
          }
        `}
      >
        Submit Estimate
      </button>
    </motion.div>
  );
}
