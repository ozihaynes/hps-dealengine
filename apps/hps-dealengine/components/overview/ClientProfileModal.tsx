"use client";

import React, { useEffect, useMemo, useRef } from "react";

import type { DealContact } from "@/lib/deals";
import type { WorkflowViewModel } from "@/lib/overviewRiskTimeline";
import { Button, Modal } from "../ui";

type ClientProfileDetails = DealContact & {
  entityType?: string | null;
  notes?: string | null;
  tags?: string[] | null;
};

type ClientProfileModalProps = {
  open: boolean;
  onClose: () => void;
  client: ClientProfileDetails | null;
  workflowState: WorkflowViewModel["state"];
  workflowReasons?: string[];
  onSendOffer?: () => void;
};

export function ClientProfileModal({
  open,
  onClose,
  client,
  workflowState,
  workflowReasons,
  onSendOffer,
}: ClientProfileModalProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const readyForOffer = workflowState === "ReadyForOffer";

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

  useEffect(() => {
    if (!open) return;
    if (contentRef.current) {
      contentRef.current.focus();
    }
  }, [open]);

  const helperMessage = useMemo(() => {
    if (readyForOffer) return null;
    if (workflowReasons && workflowReasons.length > 0) {
      return workflowReasons.join(" ");
    }
    return "This deal is not ready to send an offer yet. Finish underwriting and clear required items first.";
  }, [readyForOffer, workflowReasons]);

  const detailRows = useMemo(
    () => [
      { label: "Name", value: client?.name },
      { label: "Email", value: client?.email },
      { label: "Phone", value: client?.phone },
      { label: "Entity type", value: client?.entityType },
      {
        label: "Tags",
        value:
          Array.isArray(client?.tags) && client?.tags.length > 0
            ? client?.tags.join(", ")
            : null,
      },
      { label: "Notes", value: client?.notes },
    ],
    [client?.email, client?.entityType, client?.name, client?.notes, client?.phone, client?.tags],
  );

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={`Client profile${client?.name ? ` - ${client.name}` : ""}`}
      size="lg"
    >
      <div
        className="space-y-4 outline-none"
        ref={contentRef}
        tabIndex={-1}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {detailRows.map((row) => (
            <div
              key={row.label}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            >
              <p className="label-xs uppercase text-text-secondary">{row.label}</p>
              <p className="text-sm text-text-primary break-words">
                {row.value && String(row.value).trim().length > 0 ? row.value : "—"}
              </p>
            </div>
          ))}
        </div>

        {helperMessage && (
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-secondary">
            {helperMessage}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="neutral" onClick={onClose}>
            Close
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={!readyForOffer}
            dataTestId="cta-send-offer"
            onClick={() => {
              if (!readyForOffer) return;
              onSendOffer?.();
            }}
          >
            Send Offer
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ClientProfileModal;
