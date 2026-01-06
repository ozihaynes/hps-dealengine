/**
 * useGenerateSnapshot - Mutation hook for generating analysis snapshots
 *
 * Handles optimistic updates, cache invalidation, and error recovery
 * for the snapshot generation workflow.
 *
 * @module lib/queries/useGenerateSnapshot
 * @version 1.0.0 (Slice 22 - Data Layer Integration)
 */

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import {
  generateSnapshot,
  type SnapshotApiError,
} from "@/lib/snapshot-api";
import type { DashboardSnapshot } from "@hps-internal/contracts";

// ============================================================================
// TYPES
// ============================================================================

export interface GenerateSnapshotInput {
  dealId: string;
  /** Force regeneration even if recent snapshot exists */
  forceRegenerate?: boolean;
}

export interface GenerateSnapshotResult {
  snapshot: DashboardSnapshot;
  runId: string;
  generatedAt: string;
}

export interface UseGenerateSnapshotOptions {
  /** Callback on successful generation */
  onSuccess?: (data: GenerateSnapshotResult) => void;
  /** Callback on error */
  onError?: (error: SnapshotApiError) => void;
  /** Callback when mutation starts */
  onMutate?: (variables: GenerateSnapshotInput) => void;
  /** Callback when mutation settles (success or error) */
  onSettled?: () => void;
}

export interface UseGenerateSnapshotReturn {
  /** Trigger snapshot generation */
  generate: (input: GenerateSnapshotInput) => Promise<GenerateSnapshotResult>;
  /** Generation is in progress */
  isGenerating: boolean;
  /** Generation succeeded */
  isSuccess: boolean;
  /** Generation failed */
  isError: boolean;
  /** Error details */
  error: SnapshotApiError | null;
  /** Reset mutation state */
  reset: () => void;
  /** Current deal being processed */
  currentDealId: string | undefined;
}

// ============================================================================
// MUTATION FUNCTION
// ============================================================================

/**
 * Execute snapshot generation via API
 */
async function executeGenerate(
  input: GenerateSnapshotInput
): Promise<GenerateSnapshotResult> {
  const result = await generateSnapshot({
    dealId: input.dealId,
    forceRegenerate: input.forceRegenerate ?? false,
  });

  if (result.error) {
    throw result.error;
  }

  if (!result.data || !result.data.snapshot) {
    const error: SnapshotApiError = {
      code: "GENERATION_FAILED",
      message: "Snapshot generation failed",
      status: 500,
    };
    throw error;
  }

  return {
    snapshot: result.data.snapshot,
    runId: result.data.run_id,
    generatedAt: result.data.generated_at,
  };
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useGenerateSnapshot - Mutation hook for triggering snapshot generation
 *
 * @example
 * function AnalyzeButton({ dealId }: { dealId: string }) {
 *   const { generate, isGenerating, isError, error } = useGenerateSnapshot({
 *     onSuccess: (data) => {
 *       toast.success("Analysis complete!");
 *     },
 *     onError: (error) => {
 *       toast.error(error.message);
 *     },
 *   });
 *
 *   return (
 *     <Button
 *       onClick={() => generate({ dealId })}
 *       disabled={isGenerating}
 *     >
 *       {isGenerating ? "Analyzing..." : "Run Analysis"}
 *     </Button>
 *   );
 * }
 */
export function useGenerateSnapshot(
  options: UseGenerateSnapshotOptions = {}
): UseGenerateSnapshotReturn {
  const { onSuccess, onError, onMutate, onSettled } = options;
  const queryClient = useQueryClient();

  const mutation = useMutation<
    GenerateSnapshotResult,
    SnapshotApiError,
    GenerateSnapshotInput
  >({
    mutationFn: executeGenerate,

    // Called before mutation executes
    onMutate: async (variables) => {
      // Call user callback
      onMutate?.(variables);

      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey: queryKeys.snapshots.byDeal(variables.dealId),
      });
    },

    // On success, invalidate and refetch related queries
    onSuccess: (data, variables) => {
      // Update the snapshot cache with new data
      queryClient.setQueryData(
        queryKeys.snapshots.latest(variables.dealId),
        {
          snapshot: data.snapshot,
          isStale: false,
          snapshotRunId: data.runId,
          latestRunId: data.runId,
          asOf: data.generatedAt,
        }
      );

      // Invalidate related queries to trigger refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.snapshots.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pipeline.summary(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.analysis.byDeal(variables.dealId),
      });

      // Call user callback
      onSuccess?.(data);
    },

    // On error, notify user
    onError: (error, variables) => {
      // Refetch to get current state
      queryClient.invalidateQueries({
        queryKey: queryKeys.snapshots.byDeal(variables.dealId),
      });

      // Call user callback
      onError?.(error);
    },

    // Always called after mutation settles
    onSettled: () => {
      onSettled?.();
    },
  });

  // Wrapper function with proper typing
  const generate = async (
    input: GenerateSnapshotInput
  ): Promise<GenerateSnapshotResult> => {
    return mutation.mutateAsync(input);
  };

  return {
    generate,
    isGenerating: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error ?? null,
    reset: mutation.reset,
    currentDealId: mutation.variables?.dealId,
  };
}

// ============================================================================
// CONVENIENCE WRAPPER
// ============================================================================

/**
 * useRunAnalysis - Alias for useGenerateSnapshot with simpler API
 *
 * This provides a more intuitive name for components that trigger analysis.
 */
export function useRunAnalysis(options: UseGenerateSnapshotOptions = {}) {
  const hook = useGenerateSnapshot(options);

  return {
    runAnalysis: (dealId: string, forceRegenerate = false) =>
      hook.generate({ dealId, forceRegenerate }),
    isRunning: hook.isGenerating,
    isSuccess: hook.isSuccess,
    isError: hook.isError,
    error: hook.error,
    reset: hook.reset,
    currentDealId: hook.currentDealId,
  };
}

export default useGenerateSnapshot;
