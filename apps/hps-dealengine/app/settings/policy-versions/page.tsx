"use client";

import React from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { GlassCard } from "@/components/ui";

type Row = {
  version_id: string;
  org_id: string;
  posture: "conservative" | "base" | "aggressive";
  actor_user_id: string;
  created_at: string;
  change_summary: string | null;
};

export default function PolicyVersions() {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        const email = process.env.NEXT_PUBLIC_DEV_EMAIL!;
        const password = process.env.NEXT_PUBLIC_DEV_PASSWORD!;
        if (email && password) {
          await supabase.auth.signInWithPassword({ email, password });
        }
      }
      const { data, error } = await supabase
        .from("policy_versions_api")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) setErr(error.message);
      else setRows((data ?? []) as Row[]);
    })();
  }, []);

  return (
    <>
      {/* Preserve mobile + tablet layout exactly */}
      <div className="p-6 max-w-5xl mx-auto space-y-4 lg:hidden">
        <h1 className="text-2xl font-bold">Policy Versions</h1>
        {err && <pre className="text-red-600">{err}</pre>}
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.version_id} className="rounded-2xl border p-4">
              <div className="text-sm text-gray-500">
                {new Date(r.created_at).toLocaleString()} • {r.posture}
              </div>
              <div className="font-mono text-xs break-all">{r.version_id}</div>
              {r.change_summary && <div className="mt-1">{r.change_summary}</div>}
            </li>
          ))}
          {rows.length === 0 && <li className="text-gray-500">No versions yet.</li>}
        </ul>
      </div>

      {/* Desktop-wide layout */}
      <div className="hidden lg:block">
        <div className="mx-auto max-w-[96rem] px-6 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
                Policy Versions &amp; History
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Latest 50 policy snapshots for your org. Use this view to audit
                corridor changes over time.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            <aside className="col-span-4">
              <GlassCard className="p-5 space-y-3 lg:self-start">
                <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
                  Audit
                </p>
                <h2 className="text-lg font-semibold text-text-primary">
                  Version feed
                </h2>
                <p className="text-sm text-text-secondary">
                  Each entry captures posture, actor, and summary. Desktop uses a
                  wide two-pane layout so you can scan metadata and read change
                  summaries side-by-side.
                </p>
                {err && (
                  <div
                    role="alert"
                    className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-200"
                  >
                    {err}
                  </div>
                )}
              </GlassCard>
            </aside>

            <section className="col-span-8">
              <GlassCard className="p-4 md:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="label-xs uppercase">Versions</h2>
                  <span className="text-[11px] text-text-secondary">
                    {rows.length} row{rows.length === 1 ? "" : "s"}
                  </span>
                </div>

                {rows.length === 0 ? (
                  <p className="text-sm text-text-secondary">
                    No versions yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {rows.map((row) => (
                      <div
                        key={row.version_id}
                        className="rounded-xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg,strong)]/70 p-4 backdrop-blur"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm text-text-secondary">
                            {new Date(row.created_at).toLocaleString()} •{" "}
                            <span className="uppercase tracking-wide">{row.posture}</span>
                          </div>
                          <div className="text-[11px] text-text-secondary font-mono">
                            Actor: {row.actor_user_id.slice(0, 8)}…
                          </div>
                        </div>
                        <div className="mt-2 font-mono text-xs break-all text-text-primary/90">
                          {row.version_id}
                        </div>
                        {row.change_summary && (
                          <div className="mt-2 text-sm text-text-primary">
                            {row.change_summary}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
