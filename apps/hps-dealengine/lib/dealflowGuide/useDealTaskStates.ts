"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import type { DealTaskOverrideStatus, DealTaskStateRow } from "./guideModel";

type ListOp = { op: "list"; deal_id: string };
type UpsertOp = {
  op: "upsert";
  deal_id: string;
  task_key: string;
  override_status: DealTaskOverrideStatus;
  note?: string;
  expected_by?: string;
};
type ClearOp = { op: "clear"; deal_id: string; task_key: string };

type ListResponse =
  | { ok: true; task_states: DealTaskStateRow[] }
  | { ok: false; error: string; message: string };

type UpsertResponse =
  | { ok: true; task_state: DealTaskStateRow }
  | { ok: false; error: string; message: string };

type ClearResponse =
  | { ok: true }
  | { ok: false; error: string; message: string };

async function invokeDealTaskStates<T>(
  body: ListOp | UpsertOp | ClearOp,
): Promise<T> {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke("v1-deal-task-states", { body });

  if (error) {
    throw new Error(error.message);
  }

  return data as T;
}

function upsertLocal(
  prev: DealTaskStateRow[],
  next: DealTaskStateRow,
): DealTaskStateRow[] {
  const idx = prev.findIndex((r) => r.task_key === next.task_key);
  if (idx === -1) return [...prev, next];
  const copy = prev.slice();
  copy[idx] = next;
  return copy;
}

function removeLocal(
  prev: DealTaskStateRow[],
  taskKey: string,
): DealTaskStateRow[] {
  return prev.filter((r) => r.task_key !== taskKey);
}

export function useDealTaskStates(dealId: string | null) {
  const [rows, setRows] = useState<DealTaskStateRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmedRowsRef = useRef<DealTaskStateRow[]>([]);

  const refresh = useCallback(async () => {
    if (!dealId) {
      confirmedRowsRef.current = [];
      setRows([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await invokeDealTaskStates<ListResponse>({ op: "list", deal_id: dealId });
      if (!res.ok) throw new Error(res.message);

      confirmedRowsRef.current = res.task_states ?? [];
      setRows(confirmedRowsRef.current);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load task states.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const byKey = useMemo(() => {
    const m = new Map<string, DealTaskStateRow>();
    for (const r of rows) m.set(r.task_key, r);
    return m;
  }, [rows]);

  const setNYA = useCallback(async (taskKey: string) => {
    if (!dealId) return;

    const now = new Date().toISOString();
    const optimistic: DealTaskStateRow = {
      deal_id: dealId,
      task_key: taskKey,
      override_status: "NOT_YET_AVAILABLE",
      note: null,
      expected_by: null,
      created_at: now,
      updated_at: now,
    };

    setError(null);
    setIsSaving(true);

    setRows((prev) => upsertLocal(prev, optimistic));

    try {
      const res = await invokeDealTaskStates<UpsertResponse>({
        op: "upsert",
        deal_id: dealId,
        task_key: taskKey,
        override_status: "NOT_YET_AVAILABLE",
      });

      if (!res.ok) throw new Error(res.message);

      confirmedRowsRef.current = upsertLocal(confirmedRowsRef.current, res.task_state);
      setRows((prev) => upsertLocal(prev, res.task_state));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to persist task state.";
      setError(msg);
      setRows(confirmedRowsRef.current);
    } finally {
      setIsSaving(false);
    }
  }, [dealId]);

  const clear = useCallback(async (taskKey: string) => {
    if (!dealId) return;

    setError(null);
    setIsSaving(true);

    setRows((prev) => removeLocal(prev, taskKey));

    try {
      const res = await invokeDealTaskStates<ClearResponse>({
        op: "clear",
        deal_id: dealId,
        task_key: taskKey,
      });

      if (!res.ok) throw new Error(res.message);

      confirmedRowsRef.current = removeLocal(confirmedRowsRef.current, taskKey);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to clear task state.";
      setError(msg);
      setRows(confirmedRowsRef.current);
    } finally {
      setIsSaving(false);
    }
  }, [dealId]);

  return {
    rows,
    byKey,
    isLoading,
    isSaving,
    error,
    refresh,
    setNYA,
    clear,
  };
}
