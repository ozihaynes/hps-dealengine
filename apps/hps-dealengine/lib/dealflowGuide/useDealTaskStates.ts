"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";

export type DealTaskOverrideStatus = "NOT_YET_AVAILABLE" | "NOT_APPLICABLE";

export type DealTaskStateRow = {
  deal_id: string;
  task_key: string;
  override_status: DealTaskOverrideStatus;
  note: string | null;
  expected_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DealflowGuidePolicyTokens = {
  source: "runs" | "none";
  run_id: string | null;
  policy_hash: string | null;
  enabled: boolean;
  taskRulesByKey: Record<string, { na_allowed?: boolean }>;
};

type ListOk = {
  ok: true;
  task_states: DealTaskStateRow[];
  policy?: DealflowGuidePolicyTokens;
};

type UpsertOk = {
  ok: true;
  task_state: DealTaskStateRow;
};

type ClearOk = {
  ok: true;
};

type ApiErr = {
  ok: false;
  error: string;
  message: string;
  [k: string]: unknown;
};

function asErrorMessage(e: unknown): string {
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "message" in e && typeof (e as any).message === "string") return (e as any).message;
  return "Unknown error";
}

/**
 * Low-level persistence hook for deal_task_states.
 * - Uses caller JWT (RLS-first).
 * - Supports NOT_YET_AVAILABLE and NOT_APPLICABLE (NA is server-validated by policy).
 */
export function useDealTaskStates(dealId: string | null, posture?: string | null) {
  const [rows, setRows] = useState<DealTaskStateRow[]>([]);
  const [policy, setPolicy] = useState<DealflowGuidePolicyTokens | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byKey = useMemo(() => {
    const m = new Map<string, DealTaskStateRow>();
    for (const r of rows) m.set(r.task_key, r);
    return m;
  }, [rows]);

  const list = useCallback(async () => {
    if (!dealId) {
      setRows([]);
      setPolicy(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const supabase = getSupabase();
    try {
      const { data, error } = await supabase.functions.invoke("v1-deal-task-states", {
        body: {
          op: "list",
          deal_id: dealId,
          posture: posture ?? undefined,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      const payload = data as ListOk | ApiErr | null;
      if (!payload || payload.ok !== true) {
        setError(payload?.message ?? "Failed to load task states.");
        return;
      }

      setRows(payload.task_states ?? []);
      setPolicy(payload.policy ?? null);
    } finally {
      setIsLoading(false);
    }
  }, [dealId, posture]);

  useEffect(() => {
    list().catch((e) => setError(asErrorMessage(e)));
  }, [list]);

  const upsert = useCallback(
    async (args: { task_key: string; override_status: DealTaskOverrideStatus; note?: string | null; expected_by?: string | null }) => {
      if (!dealId) throw new Error("dealId is required");

      setIsSaving(true);
      // Optimistic update: reflect immediately, rollback on failure.
      const prev = rows;
      const nowIso = new Date().toISOString();
      const optimisticRow: DealTaskStateRow = {
        deal_id: dealId,
        task_key: args.task_key,
        override_status: args.override_status,
        note: args.note ?? null,
        expected_by: args.expected_by ?? null,
        created_at: nowIso,
        updated_at: nowIso,
      };

      setRows((cur) => {
        const next = cur.filter((r) => r.task_key !== args.task_key);
        next.push(optimisticRow);
        next.sort((a, b) => a.task_key.localeCompare(b.task_key));
        return next;
      });

      const supabase = getSupabase();
      try {
        const { data, error } = await supabase.functions.invoke("v1-deal-task-states", {
          body: {
            op: "upsert",
            deal_id: dealId,
            posture: posture ?? undefined,
            task_key: args.task_key,
            override_status: args.override_status,
            note: args.note ?? undefined,
            expected_by: args.expected_by ?? undefined,
          },
        });

        if (error) {
          setRows(prev);
          setError(error.message);
          throw new Error(error.message);
        }

        const payload = data as UpsertOk | ApiErr | null;
        if (!payload || payload.ok !== true) {
          setRows(prev);
          const message = payload?.message ?? "Failed to persist task state.";
          setError(message);
          throw new Error(message);
        }

        // Authoritative row from server
        setRows((cur) => {
          const next = cur.filter((r) => r.task_key !== payload.task_state.task_key);
          next.push(payload.task_state);
          next.sort((a, b) => a.task_key.localeCompare(b.task_key));
          return next;
        });
      } finally {
        setIsSaving(false);
      }
    },
    [dealId, posture, rows],
  );

  const clear = useCallback(
    async (task_key: string) => {
      if (!dealId) throw new Error("dealId is required");

      setIsSaving(true);
      const prev = rows;

      // Optimistic removal
      setRows((cur) => cur.filter((r) => r.task_key !== task_key));

      const supabase = getSupabase();
      try {
        const { data, error } = await supabase.functions.invoke("v1-deal-task-states", {
          body: {
            op: "clear",
            deal_id: dealId,
            posture: posture ?? undefined,
            task_key,
          },
        });

        if (error) {
          setRows(prev);
          setError(error.message);
          throw new Error(error.message);
        }

        const payload = data as ClearOk | ApiErr | null;
        if (!payload || payload.ok !== true) {
          setRows(prev);
          const message = payload?.message ?? "Failed to clear task state.";
          setError(message);
          throw new Error(message);
        }
      } finally {
        setIsSaving(false);
      }
    },
    [dealId, posture, rows],
  );

  return { rows, byKey, policy, isLoading, isSaving, error, list, upsert, clear };
}
