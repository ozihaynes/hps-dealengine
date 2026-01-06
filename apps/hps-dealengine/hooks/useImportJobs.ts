"use client";

import { useState, useEffect, useCallback } from "react";
import type { ImportJob, JobStatus } from "@hps-internal/contracts";
import {
  listImportJobs,
  subscribeToJobsList,
  type ListJobsOptions,
} from "@/lib/import/importJobsApi";

// =============================================================================
// TYPES
// =============================================================================

interface UseImportJobsState {
  jobs: ImportJob[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UseImportJobsActions {
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  setFilter: (status: JobStatus | null) => void;
}

interface UseImportJobsOptions {
  initialStatus?: JobStatus | null;
  pageSize?: number;
  enableRealtime?: boolean;
}

// =============================================================================
// HOOK
// =============================================================================

export function useImportJobs(
  options?: UseImportJobsOptions
): [UseImportJobsState, UseImportJobsActions] {
  const {
    initialStatus = null,
    pageSize = 20,
    enableRealtime = true,
  } = options ?? {};

  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<JobStatus | null>(initialStatus);
  const [offset, setOffset] = useState(0);

  // Fetch jobs
  const fetchJobs = useCallback(
    async (resetOffset = true) => {
      setIsLoading(true);
      setError(null);

      try {
        const listOptions: ListJobsOptions = {
          limit: pageSize,
          offset: resetOffset ? 0 : offset,
        };

        if (statusFilter) {
          listOptions.status = statusFilter;
        }

        const result = await listImportJobs(listOptions);

        if (resetOffset) {
          setJobs(result.jobs);
          setOffset(result.jobs.length);
        } else {
          setJobs((prev) => [...prev, ...result.jobs]);
          setOffset((prev) => prev + result.jobs.length);
        }

        setTotal(result.total);
        setHasMore(result.hasMore);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load jobs");
      } finally {
        setIsLoading(false);
      }
    },
    [statusFilter, pageSize, offset]
  );

  // Initial load
  useEffect(() => {
    fetchJobs(true);
  }, [statusFilter, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time subscription
  useEffect(() => {
    if (!enableRealtime) return;

    const unsubscribe = subscribeToJobsList((updatedJob, eventType) => {
      // If filtering and job doesn't match filter, skip
      if (statusFilter && updatedJob.status !== statusFilter) {
        // But if it was previously in our list and now doesn't match, remove it
        if (eventType === "UPDATE") {
          setJobs((prev) => prev.filter((j) => j.id !== updatedJob.id));
        }
        return;
      }

      switch (eventType) {
        case "INSERT":
          // Add to top of list
          setJobs((prev) => [updatedJob, ...prev]);
          setTotal((prev) => prev + 1);
          break;

        case "UPDATE":
          // Update in place
          setJobs((prev) =>
            prev.map((j) => (j.id === updatedJob.id ? updatedJob : j))
          );
          break;

        case "DELETE":
          // Remove from list
          setJobs((prev) => prev.filter((j) => j.id !== updatedJob.id));
          setTotal((prev) => Math.max(0, prev - 1));
          break;
      }
    });

    return unsubscribe;
  }, [enableRealtime, statusFilter]);

  // Actions
  const refresh = useCallback(async () => {
    await fetchJobs(true);
  }, [fetchJobs]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await fetchJobs(false);
  }, [fetchJobs, hasMore, isLoading]);

  const setFilter = useCallback((status: JobStatus | null) => {
    setStatusFilter(status);
    setOffset(0);
  }, []);

  return [
    { jobs, total, hasMore, isLoading, error },
    { refresh, loadMore, setFilter },
  ];
}
