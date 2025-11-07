'use client';
import React from 'react';
import AuthGate from '@/components/AuthGate';
import { supabase } from '@/lib/supabaseClient';
import PolicyRibbon from '@/components/PolicyRibbon';

type AnalyzeBody = {
  posture?: 'conservative' | 'base' | 'aggressive';
  deal?: { aiv?: number; dom_zip?: number };
};
type TraceItem = {
  id: string;
  label: string;
  formula?: string;
  inputs?: Record<string, unknown>;
  output?: unknown;
  tokens?: Record<string, unknown>;
};
type AnalyzeResp = {
  ok: boolean;
  posture: string;
  outputs: { carryMonths: number | null; aivSafetyCap: number | null };
  infoNeeded: string[];
  trace: TraceItem[];
  tokens_used: Record<string, number>;
};

export default function Page() {
  const [posture, setPosture] = React.useState<'conservative' | 'base' | 'aggressive'>('base');
  const [aiv, setAiv] = React.useState<string>('300000');
  const [domZip, setDomZip] = React.useState<string>('45');
  const [resp, setResp] = React.useState<AnalyzeResp | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function run() {
    setLoading(true);
    setErr(null);
    setResp(null);
    const body: AnalyzeBody = {
      posture,
      deal: {
        aiv: Number.isFinite(Number(aiv)) ? Number(aiv) : undefined,
        dom_zip: Number.isFinite(Number(domZip)) ? Number(domZip) : undefined,
      },
    };
    const { data, error } = await supabase.functions.invoke('v1-analyze', { body });
    if (error) setErr(error.message ?? 'invoke_error');
    setResp((data ?? null) as AnalyzeResp | null);
    setLoading(false);
  }

  return (
    <AuthGate>
      <main className="mx-auto max-w-5xl p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Underwrite</h1>

        <PolicyRibbon posture={posture} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <label className="flex flex-col gap-1">
            <span className="text-sm">Posture</span>
            <select
              value={posture}
              onChange={(e) => setPosture(e.target.value as any)}
              className="border rounded p-2"
            >
              <option value="conservative">conservative</option>
              <option value="base">base</option>
              <option value="aggressive">aggressive</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm">AIV</span>
            <input
              type="number"
              value={aiv}
              onChange={(e) => setAiv(e.target.value)}
              className="border rounded p-2"
              placeholder="300000"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm">DOM (ZIP)</span>
            <input
              type="number"
              value={domZip}
              onChange={(e) => setDomZip(e.target.value)}
              className="border rounded p-2"
              placeholder="45"
            />
          </label>

          <button
            onClick={run}
            disabled={loading}
            className="rounded px-4 py-2 border md:col-span-3"
          >
            {loading ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>

        {err ? <pre className="text-red-600 whitespace-pre-wrap">{err}</pre> : null}

        {resp && (
          <div className="space-y-4">
            <section>
              <h2 className="font-semibold">Outputs</h2>
              <pre className="bg-gray-950 text-gray-200 p-3 rounded overflow-auto">
                {JSON.stringify(resp.outputs, null, 2)}
              </pre>
            </section>

            <section>
              <h2 className="font-semibold">Trace</h2>
              <div className="space-y-2">
                {resp.trace.map((t, i) => (
                  <details key={i} className="rounded border p-2">
                    <summary className="cursor-pointer">
                      {t.label} <span className="opacity-60 text-xs">({t.id})</span>
                    </summary>
                    <pre className="bg-gray-950 text-gray-200 p-3 rounded overflow-auto">
                      {JSON.stringify(t, null, 2)}
                    </pre>
                  </details>
                ))}
              </div>
            </section>

            <section>
              <h2 className="font-semibold">Tokens Used</h2>
              <pre className="bg-gray-950 text-gray-200 p-3 rounded overflow-auto">
                {JSON.stringify(resp.tokens_used, null, 2)}
              </pre>
            </section>

            {resp.infoNeeded?.length ? (
              <section>
                <h2 className="font-semibold">Info Needed</h2>
                <pre className="bg-gray-950 text-gray-200 p-3 rounded overflow-auto">
                  {JSON.stringify(resp.infoNeeded, null, 2)}
                </pre>
              </section>
            ) : null}
          </div>
        )}
      </main>
    </AuthGate>
  );
}
