'use client';

import React from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";
import { GlassCard } from "@/components/ui";

type RunRow = {
  id: string;
  created_at: string;
  org_id: string | null;
  posture: string;
  input_hash: string;
  output_hash: string;
  policy_hash: string | null;
};

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function RunsPage() {
  const [rows, setRows] = React.useState<RunRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const supabase = getSupabase();

        // Dev auto-login (ONLY uses NEXT_PUBLIC_* env vars)
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
            "id, created_at, org_id, posture, input_hash, output_hash, policy_hash"
          )
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          throw error;
        }

        if (!cancelled && data) {
          setRows(data as RunRow[]);
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
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="p-4 md:p-5 space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Runs</h1>
            <p className="text-sm text-text-secondary">
              Latest engine runs for your org (max 50) from{" "}
              <code className="font-mono text-[11px] bg-black/40 px-1 py-0.5 rounded">
                public.runs
              </code>
              .
            </p>
          </div>
        </div>

        {loading && <div className="text-sm text-text-secondary">Loading runs.</div>}

        {error && (
          <div className="text-sm text-accent-orange border border-red-500/40 bg-red-500/10 rounded-lg px-3 py-2">
            Failed to load runs: {error}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="text-sm text-text-secondary border border-white/10 rounded-lg px-4 py-3">
            No runs found yet. Trigger an analysis from{" "}
            <Link href="/underwrite/debug" className="underline">
              Underwrite Debug
            </Link>{" "}
            to insert a run.
          </div>
        )}
      </GlassCard>

      {!loading && !error && rows.length > 0 && (
        <GlassCard className="p-3 md:p-4">
          <div className="overflow-x-auto rounded-lg border border-border/40">
            <table className="w-full text-xs">
              <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">When</th>
                  <th className="px-3 py-2 text-left">Org</th>
                  <th className="px-3 py-2 text-left">Posture</th>
                  <th className="px-3 py-2 text-left">Input hash</th>
                  <th className="px-3 py-2 text-left">Output hash</th>
                  <th className="px-3 py-2 text-left">Policy hash</th>
                  <th className="px-3 py-2 text-left"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/30 last:border-b-0 bg-black/20 hover:bg-black/30"
                  >
                    <td className="px-3 py-2 whitespace-nowrap align-top">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div
                        className="font-mono text-[11px] truncate max-w-[180px]"
                        title={row.org_id ?? ""}
                      >
                        {row.org_id ?? "-"}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className="inline-flex items-center rounded-full border border-white/20 px-2 py-0.5 text-[11px] uppercase tracking-wide">
                        {row.posture}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <code className="font-mono text-[11px]">{row.input_hash}</code>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <code className="font-mono text-[11px]">{row.output_hash}</code>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <code className="font-mono text-[11px]">{row.policy_hash ?? "-"}</code>
                    </td>
                    <td className="px-3 py-2 align-top text-right">
                      <Link href={`/runs/${row.id}`} className="text-[11px] font-medium underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
