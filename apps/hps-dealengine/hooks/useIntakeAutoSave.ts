"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveIntakeDraft } from "@/lib/intakePublic";

type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

type UseIntakeAutoSaveOptions = {
  token: string;
  linkId: string;
  debounceMs?: number;
  enabled?: boolean;
};

type UseIntakeAutoSaveResult = {
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
  save: (payload: Record<string, unknown>, sectionIndex?: number) => Promise<void>;
  scheduleAutoSave: (payload: Record<string, unknown>, sectionIndex?: number) => void;
  /** Immediately save any pending changes */
  saveNow: () => Promise<void>;
};

export function useIntakeAutoSave({
  token,
  linkId,
  debounceMs = 2000, // 2 seconds default for responsive auto-save
  enabled = true,
}: UseIntakeAutoSaveOptions): UseIntakeAutoSaveResult {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPayloadRef = useRef<Record<string, unknown> | null>(null);
  const pendingSectionIndexRef = useRef<number | undefined>(undefined);
  const isSavingRef = useRef(false);

  // Manual save function
  const save = useCallback(
    async (payload: Record<string, unknown>, sectionIndex?: number) => {
      if (!enabled || isSavingRef.current) return;

      isSavingRef.current = true;
      setStatus("saving");

      try {
        await saveIntakeDraft(token, linkId, payload, sectionIndex);
        setStatus("saved");
        setLastSavedAt(new Date());

        // Reset to idle after 3 seconds
        setTimeout(() => {
          setStatus((prev) => (prev === "saved" ? "idle" : prev));
        }, 3000);
      } catch (err) {
        console.error("Auto-save error:", err);
        setStatus("error");

        // Reset to idle after 5 seconds
        setTimeout(() => {
          setStatus((prev) => (prev === "error" ? "idle" : prev));
        }, 5000);
      } finally {
        isSavingRef.current = false;
      }
    },
    [token, linkId, enabled],
  );

  // Debounced auto-save scheduler
  const scheduleAutoSave = useCallback(
    (payload: Record<string, unknown>, sectionIndex?: number) => {
      if (!enabled) return;

      pendingPayloadRef.current = payload;
      pendingSectionIndexRef.current = sectionIndex;

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Schedule new save
      timeoutRef.current = setTimeout(async () => {
        if (pendingPayloadRef.current) {
          await save(pendingPayloadRef.current, pendingSectionIndexRef.current);
          pendingPayloadRef.current = null;
          pendingSectionIndexRef.current = undefined;
        }
      }, debounceMs);
    },
    [save, debounceMs, enabled],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Save on page unload (best effort)
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => {
      if (pendingPayloadRef.current && !isSavingRef.current) {
        // Use sendBeacon for reliable unload save
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (supabaseUrl) {
          const url = `${supabaseUrl}/functions/v1/v1-intake-save-draft`;
          const body: Record<string, unknown> = {
            intake_link_id: linkId,
            payload_json: pendingPayloadRef.current,
          };
          // Include section index if available
          if (typeof pendingSectionIndexRef.current === "number") {
            body.last_section_index = pendingSectionIndexRef.current;
          }
          navigator.sendBeacon(
            url,
            new Blob([JSON.stringify(body)], { type: "application/json" }),
          );
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [linkId, enabled]);

  // Immediately save any pending changes (for "Save & Continue Later" button)
  const saveNow = useCallback(async () => {
    // Clear any pending debounced save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Save if there's pending data
    if (pendingPayloadRef.current) {
      await save(pendingPayloadRef.current, pendingSectionIndexRef.current);
      pendingPayloadRef.current = null;
      pendingSectionIndexRef.current = undefined;
    }
  }, [save]);

  return {
    status,
    lastSavedAt,
    save,
    scheduleAutoSave,
    saveNow,
  };
}

export default useIntakeAutoSave;
