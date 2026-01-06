"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";

type RunRow = {
  id: string;
  org_id: string;
  posture: string;
  input_hash: string;
  output_hash: string;
  policy_hash: string | null;
  created_at: string;
  created_by: string | null;
  input?: unknown;
  output?: unknown;
  trace?: unknown;
  policy_snapshot?: unknown;
};

export default function RunDetailPage() {
  const params = useParams();
  const id = (params?.id as string | undefined) ?? "";

  const [run, setRun] = React.useState<RunRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const supabase = getSupabase();

        // Dev auto-login (same pattern as runs list)
        const { data: sessionResult } = await supabase.auth.getSession();
        if (
          !sessionResult.session &&
          process.env.NEXT_PUBLIC_DEV_EMAIL &&
          process.env.NEXT_PUBLIC_DEV_PASSWORD
        ) {
          const { error: signInError } =
            await supabase.auth.signInWithPassword({
              email: process.env.NEXT_PUBLIC_DEV_EMAIL,
              password: process.env.NEXT_PUBLIC_DEV_PASSWORD,
            });
          if (signInError) {
            console.error("Dev sign-in failed", signInError);
          }
        }

        const { data, error } = await supabase
          .from("runs")
          .select(
            "id, org_id, posture, input_hash, output_hash, policy_hash, created_at, created_by, input, output, trace, policy_snapshot"
          )
          .eq("id", id)
          .maybeSingle();

        if (error) {
          console.error("Error loading run", error);
          setError(error.message ?? "Failed to load run");
          setRun(null);
        } else {
          setRun(data as RunRow);
        }
      } catch (err: any) {
        console.error("Unexpected error loading run", err);
        setError(err?.message ?? "Unexpected error loading run");
        setRun(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const renderJson = (value: unknown) => {
    if (value == null)
      return (
        <span className="text-xs text-text-secondary">
          —
        </span>
      );
    try {
      return (
        <pre className="text-xs font-mono whitespace-pre-wrap break-all">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    } catch {
      return (
        <span className="text-xs font-mono break-all">
          {String(value)}
        </span>
      );
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Run detail</h1>
        <Link
          href="/runs"
          className="text-xs uppercase tracking-wide text-blue-400 hover:text-blue-300"
        >
          ← Back to runs
        </Link>
      </div>

      {loading && (
        <div className="text-sm text-text-secondary">Loading run…</div>
      )}

      {error && (
        <div className="text-sm text-red-400">
          Error: {error}
        </div>
      )}

      {!loading && !error && !run && (
        <div className="text-sm text-text-secondary">
          Run not found.
        </div>
      )}

      {run && (
        <div className="space-y-6">
          {/* Top metadata row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 text-xs">
            <div className="rounded border border-white/5 bg-white/5 p-3">
              <div className="text-text-secondary mb-1">When</div>
              <div className="font-mono">
                {new Date(run.created_at).toLocaleString()}
              </div>
            </div>
            <div className="rounded border border-white/5 bg-white/5 p-3">
              <div className="text-text-secondary mb-1">Org</div>
              <div className="font-mono break-all">{run.org_id}</div>
            </div>
            <div className="rounded border border-white/5 bg-white/5 p-3">
              <div className="text-text-secondary mb-1">Posture</div>
              <div className="font-semibold uppercase">
                {run.posture}
              </div>
            </div>
            <div className="rounded border border-white/5 bg-white/5 p-3">
              <div className="text-text-secondary mb-1">Input hash</div>
              <div className="font-mono break-all">
                {run.input_hash}
              </div>
            </div>
            <div className="rounded border border-white/5 bg-white/5 p-3">
              <div className="text-text-secondary mb-1">Output hash</div>
              <div className="font-mono break-all">
                {run.output_hash}
              </div>
            </div>
            <div className="rounded border border-white/5 bg-white/5 p-3">
              <div className="text-text-secondary mb-1">Policy hash</div>
              <div className="font-mono break-all">
                {run.policy_hash ?? "—"}
              </div>
            </div>
          </div>

          {/* JSON panels */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded border border-white/5 bg-black/40 p-4">
                <div className="text-xs font-semibold mb-2 uppercase text-text-secondary">
                  Input envelope
                </div>
                {renderJson(run.input)}
              </div>
              <div className="rounded border border-white/5 bg-black/40 p-4">
                <div className="text-xs font-semibold mb-2 uppercase text-text-secondary">
                  Output envelope
                </div>
                {renderJson(run.output)}
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded border border-white/5 bg-black/40 p-4">
                <div className="text-xs font-semibold mb-2 uppercase text-text-secondary">
                  Trace
                </div>
                {renderJson(run.trace)}
              </div>
              <div className="rounded border border-white/5 bg-black/40 p-4">
                <div className="text-xs font-semibold mb-2 uppercase text-text-secondary">
                  Policy snapshot
                </div>
                {renderJson(run.policy_snapshot)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
