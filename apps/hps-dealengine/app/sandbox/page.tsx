'use client';
import React from 'react';
import AuthGate from '@/components/AuthGate';
import { supabase } from '@/lib/supabaseClient';
import { emit } from '@/lib/eventBus';

type Policy = {
  id: string;
  posture: 'conservative' | 'base' | 'aggressive';
  is_active: boolean;
  tokens?: Record<string, unknown>;
  policy_json?: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

type KV = { k: string; v: string };

export default function SandboxPage() {
  const [posture, setPosture] = React.useState<'conservative' | 'base' | 'aggressive'>('base');
  const [policy, setPolicy] = React.useState<Policy | null>(null);
  const [rows, setRows] = React.useState<KV[]>([]);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  function toRows(tokens: Record<string, unknown> | undefined): KV[] {
    const t = tokens ?? {};
    return Object.keys(t)
      .sort()
      .map((k) => ({ k, v: String((t as any)[k]) }));
  }

  function toObject(rows: KV[]): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const { k, v } of rows) {
      // try number, else string
      const n = Number(v);
      out[k] = Number.isFinite(n) && v.trim() !== '' ? n : v;
    }
    return out;
  }

  async function load() {
    setLoading(true);
    setErr(null);
    setPolicy(null);
    setRows([]);
    // 1) Active policy via Edge Function
    const { data, error } = await supabase.functions.invoke('v1-policy-get', { body: { posture } });
    if (error) {
      setErr(error.message ?? 'invoke_error');
      setLoading(false);
      return;
    }
    const pol = (data?.policy ?? null) as Policy | null;
    setPolicy(pol);
    setRows(toRows(pol?.tokens));
    setLoading(false);
  }

  React.useEffect(() => {
    load().catch((e) => setErr(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posture]);

  function updateRow(i: number, field: 'k' | 'v', value: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { k: '', v: '' }]);
  }

  function deleteRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    setLoading(true);
    setErr(null);
    const tokens = toObject(rows.filter((r) => r.k.trim() !== ''));
    const { error } = await supabase.functions.invoke('v1-policy-put', {
      body: {
        posture,
        change_summary: 'Sandbox token edit via UI',
        tokens,
      },
    });
    if (error) setErr(error.message ?? 'save_error');
    await load();
    emit('hps:policy-updated', { posture });
    setLoading(false);
  }

  return (
    <AuthGate>
      <main className="mx-auto max-w-5xl p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Business Logic Sandbox</h1>

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

          <button onClick={load} disabled={loading} className="rounded px-4 py-2 border">
            {loading ? 'Loading…' : 'Refresh'}
          </button>

          <button onClick={save} disabled={loading} className="rounded px-4 py-2 border">
            {loading ? 'Saving…' : 'Save tokens'}
          </button>
        </div>

        {err ? <pre className="text-red-600 whitespace-pre-wrap">{err}</pre> : null}

        <section className="space-y-2">
          <h2 className="font-semibold">Active Policy</h2>
          <pre className="bg-gray-950 text-gray-200 p-3 rounded overflow-auto">
            {JSON.stringify(policy, null, 2)}
          </pre>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Tokens (key → value)</h2>
            <button className="rounded px-3 py-1 border" onClick={addRow}>
              Add row
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr,1fr,auto] gap-2">
                <input
                  className="border rounded p-2"
                  placeholder="TOKEN_KEY (e.g., AIV_CAP_PCT)"
                  value={r.k}
                  onChange={(e) => updateRow(i, 'k', e.target.value)}
                />
                <input
                  className="border rounded p-2"
                  placeholder="value (number or text)"
                  value={r.v}
                  onChange={(e) => updateRow(i, 'v', e.target.value)}
                />
                <button className="border rounded px-3" onClick={() => deleteRow(i)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </AuthGate>
  );
}
