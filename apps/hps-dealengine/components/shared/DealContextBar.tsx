"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useDealSession } from "@/lib/dealSessionContext";
import { GlassCard, Icon } from "@/components/ui";
import { SendIntakeLinkModal } from "@/components/intake/SendIntakeLinkModal";
import { ClientProfileModal } from "@/components/overview/ClientProfileModal";
import {
  extractContactFromDeal,
  extractContactFromPayload,
  formatAddressLine,
} from "@/lib/deals";
import { Icons } from "@/constants";

/**
 * DealContextBar - Persistent bar showing property address and client info
 * Displayed below the tab navigation across all pages when a deal is selected.
 * Matches the styling from the Dashboard overview page.
 */
export function DealContextBar() {
  const { deal, dbDeal } = useDealSession();

  // Modal states - must be declared before any early returns
  const [isClientProfileOpen, setIsClientProfileOpen] = useState(false);
  const [isIntakeLinkModalOpen, setIsIntakeLinkModalOpen] = useState(false);
  const clientButtonRef = useRef<HTMLButtonElement | null>(null);
  const wasClientModalOpen = useRef(false);

  // Build contact info from deal payload or dbDeal
  const contactInfo = useMemo(() => {
    if (!dbDeal) return null;
    return (
      extractContactFromPayload(deal as any) ??
      extractContactFromPayload(dbDeal?.payload ?? null) ??
      extractContactFromDeal(dbDeal)
    );
  }, [deal, dbDeal]);

  const hasContactInfo = useMemo(() => {
    if (!contactInfo) return false;
    const parts = [contactInfo.name, contactInfo.phone, contactInfo.email].map(
      (value) => (typeof value === "string" ? value.trim() : ""),
    );
    return parts.some((value) => value.length > 0);
  }, [contactInfo]);

  const contactName = hasContactInfo
    ? contactInfo?.name?.trim() || "Client"
    : "Client info not set";

  // Build client profile for modal
  const clientProfile = useMemo(() => {
    const payload =
      typeof dbDeal?.payload === "object" && dbDeal?.payload !== null
        ? (dbDeal.payload as Record<string, unknown>)
        : null;
    const payloadContact =
      (payload as any)?.contact ?? (payload as any)?.client ?? null;
    const toOptional = (value: unknown): string | undefined => {
      const str = typeof value === "string" ? value.trim() : "";
      return str.length > 0 ? str : undefined;
    };
    const tagsCandidate =
      (payloadContact as any)?.tags ??
      (payload as any)?.client_tags ??
      (payload as any)?.tags ??
      null;
    const tags =
      Array.isArray(tagsCandidate) && tagsCandidate.length > 0
        ? tagsCandidate
            .map((tag) =>
              typeof tag === "string" ? tag.trim() : String(tag ?? "").trim(),
            )
            .filter((tag) => tag.length > 0)
        : null;

    return {
      name:
        toOptional(contactInfo?.name) ??
        toOptional((payloadContact as any)?.name) ??
        toOptional(dbDeal?.client_name),
      email:
        toOptional(contactInfo?.email) ??
        toOptional((payloadContact as any)?.email) ??
        toOptional(dbDeal?.client_email),
      phone:
        toOptional(contactInfo?.phone) ??
        toOptional((payloadContact as any)?.phone) ??
        toOptional(dbDeal?.client_phone),
      entityType:
        toOptional((payloadContact as any)?.entity_type) ??
        toOptional((payloadContact as any)?.type) ??
        toOptional((payload as any)?.entity_type),
      notes:
        toOptional((payloadContact as any)?.notes) ??
        toOptional((payload as any)?.notes),
      tags,
    };
  }, [
    contactInfo?.email,
    contactInfo?.name,
    contactInfo?.phone,
    dbDeal?.client_email,
    dbDeal?.client_name,
    dbDeal?.client_phone,
    dbDeal?.payload,
  ]);

  // Build property address
  const propertyAddress = useMemo(() => {
    const primary = formatAddressLine({
      address: dbDeal?.address ?? "",
      city: dbDeal?.city ?? undefined,
      state: dbDeal?.state ?? undefined,
      zip: dbDeal?.zip ?? undefined,
    });

    if (primary) return primary;

    const property = (deal as any)?.property ?? {};
    const fallback = formatAddressLine({
      address: property.address ?? "",
      city: property.city ?? undefined,
      state: property.state ?? undefined,
      zip: property.zip ?? undefined,
    });

    return fallback || "Address not provided";
  }, [dbDeal?.address, dbDeal?.city, dbDeal?.state, dbDeal?.zip, deal]);

  // Focus management for accessibility
  useEffect(() => {
    if (wasClientModalOpen.current && !isClientProfileOpen) {
      clientButtonRef.current?.focus();
    }
    wasClientModalOpen.current = isClientProfileOpen;
  }, [isClientProfileOpen]);

  // Don't render if no active deal - MUST come after all hooks
  if (!dbDeal?.id) return null;

  return (
    <>
      <GlassCard className="p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="flex h-full flex-col justify-center gap-1 md:gap-1.5">
            <p className="text-xs uppercase text-text-secondary">Property</p>
            <div className="text-lg font-semibold text-text-primary">
              {propertyAddress}
            </div>
          </div>
          <div className="flex h-full flex-col items-start gap-1 md:items-end md:justify-center">
            <p className="text-xs uppercase text-text-secondary">Client</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                ref={clientButtonRef}
                title="View client details"
                aria-haspopup="dialog"
                aria-expanded={isClientProfileOpen}
                className="group relative inline-flex h-[28px] min-h-[28px] items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[var(--accent-blue,#0096ff)] to-[#00b8ff] px-4 text-sm font-semibold leading-tight text-white shadow-[0_4px_12px_rgba(0,150,255,0.18)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(0,150,255,0.22)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 md:px-5"
                onClick={() => setIsClientProfileOpen(true)}
              >
                <span className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 transition duration-700 ease-out group-hover:translate-x-[120%] group-hover:opacity-100" />
                <Icon d={Icons.user} size={16} className="text-white" />
                <span>{contactName}</span>
                <span className="text-[11px] font-medium uppercase tracking-wide text-white/90">
                  View
                </span>
              </button>
              <button
                type="button"
                title="Send intake form to client"
                aria-haspopup="dialog"
                aria-expanded={isIntakeLinkModalOpen}
                className="group relative inline-flex h-[28px] min-h-[28px] items-center gap-2 overflow-hidden rounded-xl border border-white/20 bg-white/5 px-4 text-sm font-semibold leading-tight text-text-primary shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 md:px-5"
                onClick={() => setIsIntakeLinkModalOpen(true)}
              >
                <Icon d={Icons.mail} size={16} className="text-text-secondary" />
                <span>Send Form</span>
              </button>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Client Profile Modal */}
      <ClientProfileModal
        open={isClientProfileOpen}
        onClose={() => setIsClientProfileOpen(false)}
        client={clientProfile}
        workflowState="Unknown"
        workflowReasons={[]}
        canSendOffer={false}
      />

      {/* Send Intake Link Modal */}
      <SendIntakeLinkModal
        open={isIntakeLinkModalOpen}
        onClose={() => setIsIntakeLinkModalOpen(false)}
        dealId={dbDeal?.id ?? null}
        prefillEmail={clientProfile?.email}
        prefillName={clientProfile?.name}
      />
    </>
  );
}

export default DealContextBar;
