"use client";

import { useState, useEffect, useCallback } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import type { ItemStatus } from "@hps-internal/contracts";
import { getSupabaseClient } from "@/lib/supabaseClient";

// =============================================================================
// TYPES
// =============================================================================

export interface ImportItemRow {
  id: string;
  job_id: string;
  row_number: number;
  dedupe_key: string;
  payload_json: Record<string, unknown>;
  status: ItemStatus;
  skip_reason: string | null;
  validation_errors: string[] | null;
  promoted_deal_id: string | null;
  created_at: string;
  updated_at: string;
}

interface UseImportItemsState {
  items: ImportItemRow[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UseImportItemsActions {
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  setFilter: (status: ItemStatus | null) => void;
}

interface UseImportItemsOptions {
  jobId: string;
  initialStatus?: ItemStatus | null;
  pageSize?: number;
  enableRealtime?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

function mapItemRow(row: Record<string, unknown>): ImportItemRow {
  return {
    id: row.id as string,
    job_id: row.job_id as string,
    row_number: Number(row.row_number),
    dedupe_key: row.dedupe_key as string,
    payload_json: row.payload_json as Record<string, unknown>,
    status: row.status as ItemStatus,
    skip_reason: row.skip_reason as string | null,
    validation_errors: row.validation_errors as string[] | null,
    promoted_deal_id: row.promoted_deal_id as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

// =============================================================================
// HOOK
// =============================================================================

export function useImportItems(
  options: UseImportItemsOptions
): [UseImportItemsState, UseImportItemsActions] {
  const {
    jobId,
    initialStatus = null,
    pageSize = 50,
    enableRealtime = true,
  } = options;

  const [items, setItems] = useState<ImportItemRow[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ItemStatus | null>(initialStatus);
  const [offset, setOffset] = useState(0);

  // Fetch items
  const fetchItems = useCallback(
    async (resetOffset = true) => {
      if (!jobId) return;

      setIsLoading(true);
      setError(null);

      try {
        const supabase = getSupabaseClient();
        const currentOffset = resetOffset ? 0 : offset;

        let query = supabase
          .from("deal_import_items")
          .select("*", { count: "exact" })
          .eq("job_id", jobId)
          .order("row_number", { ascending: true })
          .range(currentOffset, currentOffset + pageSize - 1);

        if (statusFilter) {
          query = query.eq("status", statusFilter);
        }

        const { data, error: fetchError, count } = await query;

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        const mappedItems = (data ?? []).map(mapItemRow);
        const totalCount = count ?? 0;

        if (resetOffset) {
          setItems(mappedItems);
          setOffset(mappedItems.length);
        } else {
          setItems((prev) => [...prev, ...mappedItems]);
          setOffset((prev) => prev + mappedItems.length);
        }

        setTotal(totalCount);
        setHasMore(currentOffset + mappedItems.length < totalCount);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load items");
      } finally {
        setIsLoading(false);
      }
    },
    [jobId, statusFilter, pageSize, offset]
  );

  // Initial load and filter changes
  useEffect(() => {
    fetchItems(true);
  }, [jobId, statusFilter, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time subscription
  useEffect(() => {
    if (!enableRealtime || !jobId) return;

    const supabase = getSupabaseClient();

    const channel = supabase
      .channel(`items-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deal_import_items",
          filter: `job_id=eq.${jobId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const eventType = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
          const row = (payload.new || payload.old) as Record<string, unknown>;

          if (!row) return;

          const mappedItem = mapItemRow(row);

          // If filtering and item doesn't match filter, skip or remove
          if (statusFilter && mappedItem.status !== statusFilter) {
            if (eventType === "UPDATE") {
              setItems((prev) => prev.filter((i) => i.id !== mappedItem.id));
            }
            return;
          }

          switch (eventType) {
            case "INSERT":
              // Insert in correct position based on row_number
              setItems((prev) => {
                const newItems = [...prev, mappedItem];
                return newItems.sort((a, b) => a.row_number - b.row_number);
              });
              setTotal((prev) => prev + 1);
              break;

            case "UPDATE":
              setItems((prev) =>
                prev.map((i) => (i.id === mappedItem.id ? mappedItem : i))
              );
              break;

            case "DELETE":
              setItems((prev) => prev.filter((i) => i.id !== mappedItem.id));
              setTotal((prev) => Math.max(0, prev - 1));
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableRealtime, jobId, statusFilter]);

  // Actions
  const refresh = useCallback(async () => {
    await fetchItems(true);
  }, [fetchItems]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await fetchItems(false);
  }, [fetchItems, hasMore, isLoading]);

  const setFilter = useCallback((status: ItemStatus | null) => {
    setStatusFilter(status);
    setOffset(0);
  }, []);

  return [
    { items, total, hasMore, isLoading, error },
    { refresh, loadMore, setFilter },
  ];
}
