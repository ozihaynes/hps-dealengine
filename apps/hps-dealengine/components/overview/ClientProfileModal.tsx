"use client";

import React, { useEffect, useMemo, useRef } from "react";
import {
  UserIcon,
  MailIcon,
  PhoneIcon,
  BuildingIcon,
  TagIcon,
  FileTextIcon,
  SendIcon,
  AlertCircleIcon,
  CheckCircleIcon,
} from "lucide-react";

import type { DealContact } from "@/lib/deals";
import type { WorkflowViewModel } from "@/lib/overviewRiskTimeline";
import { Modal } from "../ui";

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
  canSendOffer?: boolean;
  onSendOffer?: () => void;
};

// Section header - consistent with NewDealForm
function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-slate-500" />
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
        {title}
      </span>
    </div>
  );
}

// Detail field component
function DetailField({
  icon: Icon,
  label,
  value,
  className = "",
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  const displayValue = value && String(value).trim().length > 0 ? value : null;

  return (
    <div className={`group ${className}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className={`text-sm break-words pl-5 ${displayValue ? "text-white" : "text-slate-600"}`}>
        {displayValue ?? "Not provided"}
      </p>
    </div>
  );
}

export function ClientProfileModal({
  open,
  onClose,
  client,
  workflowState,
  workflowReasons,
  canSendOffer,
  onSendOffer,
}: ClientProfileModalProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const readyForOffer = workflowState === "ReadyForOffer";
  const sendOfferEnabled = Boolean(canSendOffer);

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

  const tagsValue = useMemo(() => {
    if (Array.isArray(client?.tags) && client?.tags.length > 0) {
      return client.tags.join(", ");
    }
    return null;
  }, [client?.tags]);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Client Profile"
      size="md"
    >
      <div
        className="space-y-6 outline-none"
        ref={contentRef}
        tabIndex={-1}
      >
        {/* Client Header - Visual hierarchy: name is most prominent */}
        <div className="flex items-center gap-4 pb-4 border-b border-slate-700/40">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/20 to-sky-600/10 border border-sky-500/30">
            <UserIcon className="w-7 h-7 text-sky-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold text-white truncate">
              {client?.name || "Unknown Client"}
            </h3>
            {client?.email && (
              <p className="text-sm text-slate-400 truncate">{client.email}</p>
            )}
          </div>
        </div>

        {/* Contact Information Section */}
        <section>
          <SectionHeader icon={PhoneIcon} title="Contact Information" />
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-700/40 bg-slate-800/30 p-4">
            <DetailField
              icon={MailIcon}
              label="Email"
              value={client?.email}
            />
            <DetailField
              icon={PhoneIcon}
              label="Phone"
              value={client?.phone}
            />
          </div>
        </section>

        {/* Additional Details Section */}
        <section>
          <SectionHeader icon={FileTextIcon} title="Details" />
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-700/40 bg-slate-800/30 p-4">
            <DetailField
              icon={BuildingIcon}
              label="Entity Type"
              value={client?.entityType}
            />
            <DetailField
              icon={TagIcon}
              label="Tags"
              value={tagsValue}
            />
            <DetailField
              icon={FileTextIcon}
              label="Notes"
              value={client?.notes}
              className="col-span-2"
            />
          </div>
        </section>

        {/* Status Message */}
        {helperMessage ? (
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <AlertCircleIcon className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-200">{helperMessage}</p>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <CheckCircleIcon className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-emerald-200">Ready to send offer</p>
          </div>
        )}

        {/* Footer with action buttons */}
        <div className="pt-4 border-t border-slate-700/30 flex justify-end gap-3">
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
            Close
          </button>
          <button
            type="button"
            disabled={!sendOfferEnabled}
            data-testid="cta-send-offer"
            onClick={() => {
              if (!sendOfferEnabled) return;
              onSendOffer?.();
            }}
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
            <SendIcon className="w-4 h-4" />
            Send Offer
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ClientProfileModal;
