"use client";

// ============================================================================
// REQUEST ESTIMATE MODAL
// ============================================================================
// Purpose: Modal form to send estimate request to a contractor
// Used in: Deal detail page, repairs tab
// Principles: motion-choreographer (enter/exit animations), accessibility-champion
// ============================================================================

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Mail,
} from "lucide-react";
import { sendEstimateRequest } from "@/lib/estimateRequests";
import type { CreateEstimateRequestInput } from "@hps-internal/contracts";
import { motionVariants, useMotion } from "./designTokens";

// ============================================================================
// TYPES
// ============================================================================

interface RequestEstimateModalProps {
  dealId: string;
  propertyAddress?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ModalState = "form" | "sending" | "success" | "error";

interface FormErrors {
  gcName?: string;
  gcEmail?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RequestEstimateModal({
  dealId,
  propertyAddress,
  isOpen,
  onClose,
  onSuccess,
}: RequestEstimateModalProps) {
  const [state, setState] = useState<ModalState>("form");
  const [errorMessage, setErrorMessage] = useState("");
  const { isReduced } = useMotion();

  // Form fields
  const [gcName, setGcName] = useState("");
  const [gcEmail, setGcEmail] = useState("");
  const [gcPhone, setGcPhone] = useState("");
  const [gcCompany, setGcCompany] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setState("form");
      setErrorMessage("");
      setGcName("");
      setGcEmail("");
      setGcPhone("");
      setGcCompany("");
      setRequestNotes("");
      setErrors({});
    }
  }, [isOpen]);

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!gcName.trim()) {
      newErrors.gcName = "Name is required";
    } else if (gcName.trim().length > 100) {
      newErrors.gcName = "Name must be under 100 characters";
    }

    if (!gcEmail.trim()) {
      newErrors.gcEmail = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gcEmail.trim())) {
      newErrors.gcEmail = "Please enter a valid email";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [gcName, gcEmail]);

  // ==========================================================================
  // SUBMISSION
  // ==========================================================================

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) return;

      setState("sending");
      setErrorMessage("");

      try {
        const input: CreateEstimateRequestInput = {
          deal_id: dealId,
          gc_name: gcName.trim(),
          gc_email: gcEmail.trim().toLowerCase(),
          gc_phone: gcPhone.trim() || null,
          gc_company: gcCompany.trim() || null,
          request_notes: requestNotes.trim() || null,
        };

        const result = await sendEstimateRequest(input);

        if (!result.ok) {
          throw new Error(result.error || "Failed to send request");
        }

        setState("success");

        // Close after success
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to send request"
        );
        setState("error");
      }
    },
    [
      dealId,
      gcName,
      gcEmail,
      gcPhone,
      gcCompany,
      requestNotes,
      validate,
      onSuccess,
      onClose,
    ]
  );

  // Handle close
  const handleClose = useCallback(() => {
    if (state === "sending") {
      // Don't allow closing during sending
      return;
    }
    onClose();
  }, [state, onClose]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && state !== "sending") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, state, onClose]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

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
            aria-labelledby="modal-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Mail className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 id="modal-title" className="text-lg font-semibold text-white">
                    Request Estimate
                  </h2>
                  {propertyAddress && (
                    <p className="text-sm text-slate-400 truncate max-w-[280px]">
                      {propertyAddress}
                    </p>
                  )}
                </div>
              </div>
              {state !== "sending" && (
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
                <form onSubmit={handleSubmit} className="space-y-4">
                  <FormInput
                    label="Contractor Name"
                    required
                    value={gcName}
                    onChange={setGcName}
                    error={errors.gcName}
                    maxLength={100}
                    autoFocus
                    placeholder="John Smith"
                  />

                  <FormInput
                    label="Email"
                    required
                    type="email"
                    value={gcEmail}
                    onChange={setGcEmail}
                    error={errors.gcEmail}
                    placeholder="contractor@example.com"
                  />

                  <FormInput
                    label="Phone"
                    type="tel"
                    value={gcPhone}
                    onChange={setGcPhone}
                    maxLength={20}
                    placeholder="(555) 123-4567"
                  />

                  <FormInput
                    label="Company"
                    value={gcCompany}
                    onChange={setGcCompany}
                    maxLength={100}
                    placeholder="ABC Contractors"
                  />

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">
                      Notes for contractor (optional)
                    </label>
                    <textarea
                      value={requestNotes}
                      onChange={(e) => setRequestNotes(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      placeholder="Any specific areas to focus on, access instructions, etc."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <p className="text-slate-600 text-xs mt-1 text-right">
                      {requestNotes.length}/1000
                    </p>
                  </div>

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
                      type="submit"
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Send Request
                    </button>
                  </div>
                </form>
              )}

              {/* Sending State */}
              {state === "sending" && (
                <div className="text-center py-6">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                    <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
                  </div>
                  <p className="text-white font-medium">Sending Request...</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Please wait while we send the estimate request
                  </p>
                </div>
              )}

              {/* Success State */}
              {state === "success" && (
                <div className="text-center py-6">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                    <CheckCircle className="h-8 w-8 text-emerald-400" />
                  </div>
                  <p className="text-white font-medium">Request Sent!</p>
                  <p className="text-sm text-slate-400 mt-1">
                    An email has been sent to {gcEmail.trim().toLowerCase()}
                  </p>
                </div>
              )}

              {/* Error State */}
              {state === "error" && (
                <>
                  <div className="text-center mb-6">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                      <AlertTriangle className="h-8 w-8 text-red-400" />
                    </div>
                    <p className="text-white font-medium">Failed to Send</p>
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
                      className="flex-1 px-4 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
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

// ============================================================================
// FORM INPUT COMPONENT
// ============================================================================

interface FormInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  type?: string;
  maxLength?: number;
  placeholder?: string;
  autoFocus?: boolean;
}

function FormInput({
  label,
  value,
  onChange,
  error,
  required,
  type = "text",
  maxLength,
  placeholder,
  autoFocus,
}: FormInputProps) {
  const id = `input-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div>
      <label htmlFor={id} className="block text-sm text-slate-400 mb-1">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`
          w-full bg-slate-800 border rounded-lg px-4 py-2.5 text-white placeholder-slate-500
          focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
          ${error ? "border-red-500" : "border-slate-700"}
        `}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="text-red-400 text-xs mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
