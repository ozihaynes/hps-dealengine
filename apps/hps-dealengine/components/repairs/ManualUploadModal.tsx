"use client";

// ============================================================================
// MANUAL UPLOAD MODAL (Slice F)
// ============================================================================
// Purpose: Allow user to manually upload estimate received outside portal
// Use case: GC sends via text, WhatsApp, email attachment, fax
// Principles: motion-choreographer (enter/exit animations), accessibility-champion
// ============================================================================

import { useState, useCallback, useId, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { motionVariants, useMotion } from "./designTokens";

// ============================================================================
// TYPES
// ============================================================================

interface ManualUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string;
  orgId: string;
  propertyAddress: string;
  onSuccess?: () => void;
}

type ModalState = "form" | "uploading" | "success" | "error";

// ============================================================================
// CONSTANTS
// ============================================================================

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ============================================================================
// COMPONENT
// ============================================================================

export function ManualUploadModal({
  isOpen,
  onClose,
  dealId,
  orgId,
  propertyAddress,
  onSuccess,
}: ManualUploadModalProps) {
  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  const [state, setState] = useState<ModalState>("form");
  const [file, setFile] = useState<File | null>(null);
  const [gcName, setGcName] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const { isReduced } = useMotion();

  const fileInputId = useId();

  // -------------------------------------------------------------------------
  // RESET ON OPEN
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (isOpen) {
      setState("form");
      setFile(null);
      setGcName("");
      setNotes("");
      setErrorMessage("");
      setIsDragOver(false);
    }
  }, [isOpen]);

  // -------------------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------------------

  const handleClose = useCallback(() => {
    if (state === "uploading") return;
    onClose();
  }, [state, onClose]);

  const validateFile = (f: File): string | null => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return "Please upload a PDF or image file (JPG, PNG, WebP)";
    }
    if (f.size > MAX_FILE_SIZE) {
      return "File size must be under 10MB";
    }
    if (f.size === 0) {
      return "File appears to be empty";
    }
    return null;
  };

  const handleFileSelect = (f: File) => {
    const error = validateFile(f);
    if (error) {
      setErrorMessage(error);
      return;
    }
    setFile(f);
    setErrorMessage("");
  };

  const onFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFileSelect(selectedFile);
  };

  const handleSubmit = async () => {
    if (!file || !gcName.trim() || !dealId || !orgId) return;

    setState("uploading");
    setErrorMessage("");

    try {
      const supabase = getSupabaseClient();

      // 1. Upload file to storage
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const sanitizedExt = ["pdf", "jpg", "jpeg", "png", "webp"].includes(fileExt)
        ? fileExt
        : "pdf";
      const timestamp = Date.now();
      const filePath = `${orgId}/${dealId}/manual-${timestamp}.${sanitizedExt}`;

      const { error: uploadError } = await supabase.storage
        .from("repair-estimates")
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // 2. Create estimate_request record with "submitted" status
      const { error: dbError } = await supabase.from("estimate_requests").insert({
        org_id: orgId,
        deal_id: dealId,
        gc_name: gcName.trim(),
        gc_email: "manual@internal.upload", // Placeholder for manual uploads
        status: "submitted",
        submitted_at: new Date().toISOString(),
        estimate_file_path: filePath,
        estimate_file_name: file.name,
        estimate_file_size_bytes: file.size,
        estimate_file_type: file.type,
        gc_notes: notes.trim() || `Manual upload: ${file.name}`,
        // Token fields use defaults from DB
      });

      if (dbError) {
        // Clean up uploaded file
        await supabase.storage.from("repair-estimates").remove([filePath]);
        throw new Error(`Database error: ${dbError.message}`);
      }

      setState("success");

      // Auto-close after success
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (error) {
      console.error("[ManualUploadModal] Error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Upload failed");
      setState("error");
    }
  };

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && state !== "uploading") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, state, onClose]);

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop with fade animation */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={isReduced ? undefined : motionVariants.modal.overlay.initial}
            animate={motionVariants.modal.overlay.animate}
            exit={isReduced ? undefined : motionVariants.modal.overlay.exit}
            transition={motionVariants.modal.overlay.transition}
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Modal with scale + slide animation */}
          <motion.div
            className="relative z-10 w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 shadow-xl overflow-hidden"
            initial={isReduced ? undefined : motionVariants.modal.content.initial}
            animate={motionVariants.modal.content.animate}
            exit={isReduced ? undefined : motionVariants.modal.content.exit}
            transition={motionVariants.modal.content.transition}
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-upload-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Upload className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 id="manual-upload-title" className="text-lg font-semibold text-white">
                    Manual Estimate Upload
                  </h2>
                  {propertyAddress && (
                    <p className="text-sm text-slate-400 truncate max-w-[280px]">
                      {propertyAddress}
                    </p>
                  )}
                </div>
              </div>
              {state !== "uploading" && (
                <button
                  onClick={handleClose}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Form State */}
              {state === "form" && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-400">
                    Upload an estimate received outside the portal (via text, email, etc.)
                  </p>

                  {/* GC Name */}
                  <div>
                    <label htmlFor="gc-name-input" className="block text-sm font-medium text-slate-300 mb-1">
                      Contractor Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="gc-name-input"
                      type="text"
                      value={gcName}
                      onChange={(e) => setGcName(e.target.value)}
                      placeholder="e.g., ABC Roofing"
                      maxLength={100}
                      className="w-full px-3 py-2.5 min-h-[44px] bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Estimate File <span className="text-red-400">*</span>
                    </label>
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
                      onClick={() => document.getElementById(fileInputId)?.click()}
                      className={`
                        relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                        focus:outline-none focus:ring-2 focus:ring-blue-500
                        ${isDragOver ? "border-blue-500 bg-blue-500/10" : "border-slate-600 hover:border-slate-500"}
                        ${file ? "bg-slate-800" : ""}
                      `}
                    >
                      <input
                        id={fileInputId}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={onFileInputChange}
                        className="sr-only"
                      />

                      {file ? (
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-blue-400 flex-shrink-0" />
                          <div className="text-left min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-sm text-slate-400">
                            Drop file here or click to browse
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            PDF, JPG, PNG, WebP — Max 10MB
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label htmlFor="notes-input" className="block text-sm font-medium text-slate-300 mb-1">
                      Notes (optional)
                    </label>
                    <textarea
                      id="notes-input"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g., Received via text on 1/8"
                      rows={2}
                      maxLength={500}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  {/* Error Message */}
                  {errorMessage && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {errorMessage}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex-1 px-4 py-2.5 min-h-[44px] text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-600 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!file || !gcName.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Upload
                    </button>
                  </div>
                </div>
              )}

              {/* Uploading State */}
              {state === "uploading" && (
                <div className="text-center py-6">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">
                    <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                  </div>
                  <p className="text-white font-medium">Uploading estimate...</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Please wait while we save the file
                  </p>
                </div>
              )}

              {/* Success State */}
              {state === "success" && (
                <div className="text-center py-6">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                    <CheckCircle className="h-8 w-8 text-emerald-400" />
                  </div>
                  <p className="text-white font-medium">Upload Complete!</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Estimate from {gcName} has been saved.
                  </p>
                </div>
              )}

              {/* Error State */}
              {state === "error" && (
                <>
                  <div className="text-center mb-6">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                      <AlertCircle className="h-8 w-8 text-red-400" />
                    </div>
                    <p className="text-white font-medium">Upload Failed</p>
                    <p className="text-sm text-red-400 mt-2">{errorMessage}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleClose}
                      className="flex-1 px-4 py-2.5 min-h-[44px] text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-600 rounded-lg transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        setState("form");
                        setErrorMessage("");
                      }}
                      className="flex-1 px-4 py-2.5 min-h-[44px] bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
