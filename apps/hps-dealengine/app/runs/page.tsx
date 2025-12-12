'use client';

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RunInputEnvelope } from "@hps-internal/contracts";
import { Postures } from "@hps-internal/contracts";

import { GlassCard, Button } from "@/components/ui";
import { useDealSession, normalizeDealShape } from "@/lib/dealSessionContext";
import { getSupabaseClient } from "@/lib/supabaseClient";
import {
  upsertWorkingState,
  type WorkingStatePayload,
} from "@/lib/workingState";
import {
  DEFAULT_SANDBOX_CONFIG,
  mergeSandboxConfig,
} from "@/constants/sandboxSettings";

type RunRow = {
  id: string;
  created_at: string;
  org_id: string | null;
  deal_id?: string | null;
  posture: string;
  input_hash?: string | null;
  output_hash?: string | null;
  policy_hash?: string | null;
  input?: RunInputEnvelope | null;
  output?: unknown;
};

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function RunsPage() {
  const router = useRouter();
  const supabase = React.useMemo(() => getSupabaseClient(), []);
  const {
    dbDeal,
    setDeal,
    setSandbox,
    setPosture,
    setLastAnalyzeResult,
    setLastRunAt,
    setLastRunId,
    setActiveRepairProfileId,
    setHasUnsavedDealChanges,
  } = useDealSession();
  const [userId, setUserId] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<RunRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [continuingId, setContinuingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }: { data: { user: { id: string | null } | null } }) => setUserId(data.user?.id ?? null))
      .catch(() => setUserId(null));
  }, [supabase]);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!dbDeal?.id || !dbDeal.org_id) {
        setRows([]);
        setLoading(false);
        setError("Select a deal to view its runs.");
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data: sessionResult } = await supabase.auth.getSession();
        if (
          !sessionResult.session &&
          process.env.NEXT_PUBLIC_DEV_EMAIL &&
          process.env.NEXT_PUBLIC_DEV_PASSWORD
        ) {
          await supabase.auth.signInWithPassword({
            email: process.env.NEXT_PUBLIC_DEV_EMAIL,
            password: process.env.NEXT_PUBLIC_DEV_PASSWORD,
          });
        }

        const { data, error } = await supabase
          .from("runs")
          .select(
            "id, created_at, org_id, deal_id, posture, input_hash, output_hash, policy_hash, input, output",
          )
          .eq("org_id", dbDeal.org_id)
          .or(`deal_id.eq.${dbDeal.id},input->>dealId.eq.${dbDeal.id}`)
          .order("created_at", { ascending: false })
          .limit(25);

        if (error) {
          throw error;
        }

        if (!cancelled) {
          setRows((data ?? []) as RunRow[]);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? "Failed to load runs");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [dbDeal?.id, dbDeal?.org_id, supabase]);

  const handleContinue = React.useCallback(
    async (run: RunRow) => {
      setError(null);
      if (!dbDeal?.id || !dbDeal.org_id) {
        setError("Select a deal before continuing from a run.");
        return;
      }
      if (!userId) {
        setError("You must be signed in to load runs.");
        return;
      }
      if (!run.input) {
        setError("Run is missing input payload; cannot continue.");
        return;
      }

      setContinuingId(run.id);
      const postureValue =
        (run.input.posture as (typeof Postures)[number]) ??
        (run.posture as (typeof Postures)[number]) ??
        "base";
      const outputs = (run.output as any)?.outputs ?? (run.output as any);
      const hasOffer =
        outputs && typeof outputs.primary_offer !== "undefined" && outputs.primary_offer !== null;
      const payload: WorkingStatePayload = {
        deal: (run.input.deal as any) ?? {},
        sandbox: (run.input.sandbox as any) ?? {},
        repairProfile:
          typeof run.input.repairProfile !== "undefined"
            ? (run.input.repairProfile as any)
            : null,
        activeRepairProfileId: (run.input.repairProfile as any)?.profileId ?? null,
        activeOfferRunId: hasOffer ? run.id : null,
      };

      try {
        await upsertWorkingState(supabase, {
          orgId: dbDeal.org_id,
          dealId: dbDeal.id,
          userId,
          posture: postureValue,
          payload,
          sourceRunId: run.id,
        });

        setDeal(normalizeDealShape(payload.deal ?? {}));
        setSandbox(
          mergeSandboxConfig(payload.sandbox ?? DEFAULT_SANDBOX_CONFIG),
        );
        setPosture(postureValue);
        setActiveRepairProfileId(payload.activeRepairProfileId ?? null);
        setLastAnalyzeResult((run.output as any) ?? null);
        setLastRunId(run.id);
        setLastRunAt(run.created_at ?? null);
        setHasUnsavedDealChanges(false);

        const nextHref = hasOffer
          ? `/overview?dealId=${dbDeal.id}`
          : `/underwrite?dealId=${dbDeal.id}`;
        router.push(nextHref);
      } catch (err: any) {
        setError(err?.message ?? "Unable to continue from this run.");
      } finally {
        setContinuingId(null);
      }
    },
    [
      dbDeal?.id,
      dbDeal?.org_id,
      router,
      setActiveRepairProfileId,
      setDeal,
      setHasUnsavedDealChanges,
      setLastAnalyzeResult,
      setLastRunAt,
      setLastRunId,
      setPosture,
      setSandbox,
      supabase,
      userId,
    ],
  );

  const dealLabel =
    dbDeal?.address ||
    (typeof dbDeal?.payload === "object" && dbDeal?.payload
      ? (dbDeal.payload as Record<string, unknown>)["address"]
      : undefined) ||
    dbDeal?.city ||
    dbDeal?.id ||
    "";

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-5">
      <GlassCard className="p-4 md:p-5 space-y-3 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.7)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
              Runs{dealLabel ? ` for ${dealLabel}` : ""}
            </h1>
            <p className="text-sm text-text-secondary">
              Latest runs for the active deal. Continue to rehydrate Underwrite without changing history.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dbDeal?.id ? (
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-text-secondary">
                Deal ID: {dbDeal.id}
              </span>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                router.push(dbDeal?.id ? `/underwrite?dealId=${dbDeal.id}` : "/underwrite")
              }
            >
              Back to Underwrite
            </Button>
          </div>
        </div>

        {loading && (
          <div className="text-sm text-text-secondary">Loading runs.</div>
        )}

        {error && (
          <div className="text-sm text-accent-orange border border-red-500/40 bg-red-500/10 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="text-sm text-text-secondary border border-white/10 rounded-lg px-4 py-3 bg-white/5">
            No runs found for this deal yet. Analyze in Underwrite to create one.
          </div>
        )}
      </GlassCard>

      {!loading && !error && rows.length > 0 && (
        <GlassCard className="p-3 md:p-4 space-y-3 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.7)]">
          <div className="overflow-hidden rounded-xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg,strong)]/80 backdrop-blur">
            <table className="w-full text-xs">
              <thead className="bg-white/5 text-[10px] uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-3 py-3 text-left">When</th>
                  <th className="px-3 py-3 text-left">Posture</th>
                  <th className="px-3 py-3 text-left">Input hash</th>
                  <th className="px-3 py-3 text-left">Output hash</th>
                  <th className="px-3 py-3 text-left">Policy hash</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const statusLabel = row.output_hash ? "Analyzed" : "Saved";
                  return (
                    <tr
                      key={row.id}
                      className="border-t border-white/5 bg-white/[0.01] hover:bg-white/[0.04] transition-colors"
                    >
                      <td className="px-3 py-3 whitespace-nowrap align-top">
                        {formatDateTime(row.created_at)}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] uppercase tracking-wide">
                            {row.posture}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              statusLabel === "Analyzed"
                                ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30"
                                : "bg-white/5 text-text-secondary border border-white/10"
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <code className="font-mono text-[11px] text-text-secondary">
                          {row.input_hash ?? "-"}
                        </code>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <code className="font-mono text-[11px] text-text-secondary">
                          {row.output_hash ?? "-"}
                        </code>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <code className="font-mono text-[11px] text-text-secondary">
                          {row.policy_hash ?? "-"}
                        </code>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={continuingId === row.id || !row.input}
                            onClick={() => void handleContinue(row)}
                          >
                            {continuingId === row.id
                              ? "Continuing..."
                              : "Continue from this run"}
                          </Button>
                          <Link
                            href={`/runs/${row.id}`}
                            className="text-[11px] font-semibold text-accent-blue hover:text-accent-blue/80 underline"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
