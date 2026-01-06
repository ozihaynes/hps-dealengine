"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, InputField, Modal } from "../ui";
import { sendIntakeLink } from "@/lib/intake";

type SendIntakeLinkModalProps = {
  open: boolean;
  onClose: () => void;
  dealId: string | null;
  prefillEmail?: string;
  prefillName?: string;
};

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
        className="space-y-4 outline-none"
        ref={contentRef}
        tabIndex={-1}
      >
        {successUrl ? (
          // Success state
          <>
            <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3">
              <p className="text-sm font-semibold text-emerald-200">
                Intake link sent successfully!
              </p>
              <p className="mt-1 text-xs text-emerald-200/80">
                The client will receive an email with the link. You can also copy the URL below
                to share manually.
              </p>
            </div>

            <div className="space-y-2">
              <label className="label-xs uppercase text-text-secondary">
                Intake URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={successUrl}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none"
                />
                <Button
                  size="sm"
                  variant="neutral"
                  onClick={handleCopyUrl}
                >
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button size="sm" variant="primary" onClick={onClose}>
                Done
              </Button>
            </div>
          </>
        ) : (
          // Form state
          <>
            <InputField
              label="Client Email *"
              type="email"
              value={email}
              dataTestId="intake-recipient-email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
            />

            <InputField
              label="Client Name (optional)"
              type="text"
              value={name}
              dataTestId="intake-recipient-name"
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
            />

            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-secondary">
              The client will receive an email with a secure link to fill out the intake form.
              The link expires in 14 days.
            </div>

            {error && (
              <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button size="sm" variant="neutral" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={loading || !dealId}
                dataTestId="intake-send-button"
                onClick={handleSubmit}
              >
                {loading ? "Sending..." : "Send Link"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default SendIntakeLinkModal;
