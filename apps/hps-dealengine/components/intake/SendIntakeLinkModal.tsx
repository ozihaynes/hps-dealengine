"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "../ui";
import { sendIntakeLink } from "@/lib/intake";
import { MailIcon, UserIcon, SendIcon, Loader2Icon, CheckIcon, CopyIcon } from "lucide-react";

type SendIntakeLinkModalProps = {
  open: boolean;
  onClose: () => void;
  dealId: string | null;
  prefillEmail?: string;
  prefillName?: string;
};

// Shared input classes - matching NewDealForm
const inputClasses = `
  w-full
  h-11
  px-3.5
  bg-slate-800/60
  border border-slate-600/40
  rounded-lg
  text-sm text-white
  placeholder:text-slate-500
  transition-all duration-150
  focus:outline-none
  focus:border-sky-500/70
  focus:ring-1
  focus:ring-sky-500/20
  focus:bg-slate-800/80
`;

// Form field wrapper - matching NewDealForm
function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// Section header - matching NewDealForm
function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-slate-500" />
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
        {title}
      </span>
    </div>
  );
}

export function SendIntakeLinkModal({
  open,
  onClose,
  dealId,
  prefillEmail,
  prefillName,
}: SendIntakeLinkModalProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [name, setName] = useState(prefillName ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successUrl, setSuccessUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setEmail(prefillEmail ?? "");
      setName(prefillName ?? "");
      setError(null);
      setSuccessUrl(null);
      setCopied(false);
    }
  }, [open, prefillEmail, prefillName]);

  // Focus management
  useEffect(() => {
    if (!open) return;
    if (contentRef.current) {
      contentRef.current.focus();
    }
  }, [open]);

  // Escape key handling
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!dealId) {
      setError("No deal selected. Save a run first.");
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await sendIntakeLink({
        dealId,
        recipientEmail: trimmedEmail,
        recipientName: name.trim() || undefined,
      });

      setSuccessUrl(result.intake_url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send intake link.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [dealId, email, name]);

  const handleCopyUrl = useCallback(async () => {
    if (!successUrl) return;
    try {
      await navigator.clipboard.writeText(successUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = successUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [successUrl]);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Send Intake Form to Client"
      size="md"
    >
      <div
        className="space-y-6 outline-none"
        ref={contentRef}
        tabIndex={-1}
      >
        {successUrl ? (
          // Success state
          <>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckIcon className="w-4 h-4 text-emerald-400" />
                <p className="text-sm font-semibold text-emerald-300">
                  Intake link sent successfully!
                </p>
              </div>
              <p className="text-xs text-emerald-300/80 ml-6">
                The client will receive an email with the link. You can also copy the URL below
                to share manually.
              </p>
            </div>

            <FormField label="Intake URL">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={successUrl}
                  className={`${inputClasses} flex-1 cursor-text`}
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="
                    h-11 px-4
                    text-sm font-medium
                    text-slate-300
                    bg-slate-800/60
                    border border-slate-600/40
                    hover:border-slate-500/50 hover:text-white hover:bg-slate-700/50
                    rounded-lg
                    transition-all duration-150
                    flex items-center gap-2
                  "
                >
                  {copied ? (
                    <>
                      <CheckIcon className="w-4 h-4 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </FormField>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-700/30 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="
                  px-5 py-2
                  text-sm font-medium
                  text-white
                  bg-sky-600
                  hover:bg-sky-500
                  rounded-lg
                  shadow-lg shadow-sky-500/20
                  transition-all duration-150
                  flex items-center gap-2
                "
              >
                <CheckIcon className="w-4 h-4" />
                Done
              </button>
            </div>
          </>
        ) : (
          // Form state
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <section>
              <SectionHeader icon={MailIcon} title="Client Information" />
              <div className="space-y-4">
                <FormField label="Client Email" required>
                  <input
                    type="email"
                    value={email}
                    data-testid="intake-recipient-email"
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@example.com"
                    className={inputClasses}
                  />
                </FormField>

                <FormField label="Client Name">
                  <input
                    type="text"
                    value={name}
                    data-testid="intake-recipient-name"
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className={inputClasses}
                  />
                </FormField>
              </div>
            </section>

            {/* Info box */}
            <div className="mt-6 rounded-lg border border-slate-600/40 bg-slate-800/40 px-4 py-3 text-xs text-slate-400">
              <p>
                The client will receive an email with a secure link to fill out the intake form.
                The link expires in 14 days.
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Footer with action buttons */}
            <div className="mt-6 pt-4 border-t border-slate-700/30 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="
                  px-4 py-2
                  text-sm font-medium
                  text-slate-300
                  hover:text-white
                  hover:bg-slate-700/50
                  rounded-lg
                  transition-colors
                "
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !dealId}
                data-testid="intake-send-button"
                className="
                  px-5 py-2
                  text-sm font-medium
                  text-white
                  bg-sky-600
                  hover:bg-sky-500
                  rounded-lg
                  shadow-lg shadow-sky-500/20
                  transition-all duration-150
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                  flex items-center gap-2
                "
              >
                {loading ? (
                  <>
                    <Loader2Icon className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <SendIcon className="w-4 h-4" />
                    Send Link
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

export default SendIntakeLinkModal;
