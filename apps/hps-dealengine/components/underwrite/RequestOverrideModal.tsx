"use client";

import React, { useEffect, useState } from "react";
import { Button, Modal } from "@/components/ui";
import { requestPolicyOverride } from "@/lib/policyOverrides";

interface RequestOverrideModalProps {
  open: boolean;
  posture: "conservative" | "base" | "aggressive";
  lastRunId?: string | null;
  defaultTokenKey?: string | null;
  defaultNewValue?: unknown;
  onClose: () => void;
  onRequested?: (result: any) => void;
}

export function RequestOverrideModal({
  open,
  posture,
  lastRunId,
  defaultTokenKey,
  defaultNewValue,
  onClose,
  onRequested,
}: RequestOverrideModalProps) {
  const [tokenKey, setTokenKey] = useState("");
  const [newValueText, setNewValueText] = useState("");
  const [justification, setJustification] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form state whenever the modal is opened
  useEffect(() => {
    if (open) {
      setTokenKey((defaultTokenKey ?? "").trim());
      const prefillValue =
        typeof defaultNewValue === "undefined"
          ? ""
          : JSON.stringify(defaultNewValue, null, 2);
      setNewValueText(prefillValue);
      setJustification("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [open, defaultTokenKey, defaultNewValue]);

  const handleSubmit = async () => {
    setError(null);

    if (!tokenKey.trim()) {
      setError("tokenKey is required.");
      return;
    }

    if (!newValueText.trim()) {
      setError("newValue cannot be empty. Provide valid JSON.");
      return;
    }

    let parsedNewValue: unknown;
    try {
      parsedNewValue = JSON.parse(newValueText);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`newValue must be valid JSON: ${message}`);
      return;
    }

    if (!justification.trim()) {
      setError("Justification is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await requestPolicyOverride({
        posture,
        tokenKey: tokenKey.trim(),
        newValue: parsedNewValue,
        justification: justification.trim(),
        runId: lastRunId ?? null,
      });

      onRequested?.(result);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Request Policy Override"
      size="lg"
    >
      <div className="space-y-4">
        <div className="text-sm text-text-secondary">
          <span className="font-semibold text-text-primary">Posture:</span>{" "}
          <span className="uppercase tracking-wide text-text-primary">
            {posture}
          </span>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-text-primary">
            tokenKey
          </label>
          <input
            className="w-full rounded border border-border-subtle bg-surface-elevated px-3 py-2 text-sm text-text-primary focus:border-accent-blue focus:outline-none"
            value={tokenKey}
            onChange={(e) => setTokenKey(e.target.value)}
            placeholder="e.g. policy.min_spread"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-text-primary">
            newValue (JSON)
          </label>
          <textarea
            className="w-full min-h-[140px] rounded border border-border-subtle bg-surface-elevated px-3 py-2 text-sm font-mono text-text-primary focus:border-accent-blue focus:outline-none"
            value={newValueText}
            onChange={(e) => setNewValueText(e.target.value)}
            placeholder='{"value": 0.85}'
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-text-primary">
            Justification
          </label>
          <textarea
            className="w-full min-h-[100px] rounded border border-border-subtle bg-surface-elevated px-3 py-2 text-sm text-text-primary focus:border-accent-blue focus:outline-none"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Explain the evidence or context that supports this override."
          />
        </div>

        {error && (
          <div className="rounded border border-red-500/40 bg-red-500/5 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="neutral"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Request Override"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default RequestOverrideModal;
