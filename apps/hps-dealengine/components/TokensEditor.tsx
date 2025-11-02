'use client';

import { useEffect, useState } from 'react';

type TokenValue = string | number | boolean | null;
type Tokens = Record<string, TokenValue>;

export default function TokensEditor() {
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [working, setWorking] = useState<Tokens | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [path, setPath] = useState<string>('');

  async function load() {
    setErr(null);
    setMsg(null);
    try {
      const r = await fetch('/api/tokens', { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(`GET /api/tokens failed (${r.status})`);
      const j = await r.json();
      setTokens(j?.tokens ?? {});
      setWorking(j?.tokens ?? {});
      setPath(r.headers.get('x-token-path') ?? '');
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load tokens');
    }
  }

  useEffect(() => {
    load();
  }, []);

  function onChange(key: string, raw: string | boolean) {
    setWorking((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      const current = prev[key];
      if (typeof current === 'number') {
        const v = (raw as string).trim();
        next[key] = v === '' ? (NaN as unknown as number) : Number(v);
      } else if (typeof current === 'boolean') {
        next[key] = Boolean(raw);
      } else if (current === null) {
        // null stays null unless user types something -> string
        const v = raw as string;
        next[key] = v === '' ? null : v;
      } else {
        next[key] = String(raw);
      }
      return next;
    });
  }

  async function saveAll() {
    if (!working) return;
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      // PUT body can be partial or full; we send full working map
      const r = await fetch('/api/tokens', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(working),
      });
      if (!r.ok) throw new Error(`PUT /api/tokens failed (${r.status})`);
      const j = await r.json();
      setTokens(j?.tokens ?? working);
      setWorking(j?.tokens ?? working);
      setMsg('Saved ✓');
    } catch (e: any) {
      setErr(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!working && !err) return <div className="text-sm opacity-70">Loading tokens…</div>;
  if (err) return <div className="text-sm text-red-300">Error: {err}</div>;

  const rows = Object.entries(working ?? {});

  return (
    <section className="rounded-2xl p-5 border border-white/10 bg-white/5 backdrop-blur space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold">Tokens</div>
        <div className="text-xs opacity-70">File: {path || 'in-memory'}</div>
      </div>

      <div className="text-xs overflow-auto max-h-[60vh] rounded-lg border border-white/10">
        <table className="w-full">
          <thead className="bg-white/10">
            <tr>
              <th className="text-left p-2">Key</th>
              <th className="text-left p-2">Value</th>
              <th className="text-left p-2">Type</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, v]) => {
              const typ = v === null ? 'null' : typeof v;
              return (
                <tr key={k} className="odd:bg-white/5 align-top">
                  <td className="p-2 font-mono text-[11px]">{k}</td>
                  <td className="p-2">
                    {typeof v === 'number' ? (
                      <input
                        className="rounded-xl px-3 py-2 bg-black/30 border border-white/10 focus:outline-none w-40"
                        type="number"
                        value={Number.isFinite(v) ? v : ''}
                        onChange={(e) => onChange(k, e.target.value)}
                      />
                    ) : typeof v === 'boolean' ? (
                      <input
                        type="checkbox"
                        checked={Boolean(v)}
                        onChange={(e) => onChange(k, e.target.checked)}
                      />
                    ) : (
                      <input
                        className="rounded-xl px-3 py-2 bg-black/30 border border-white/10 focus:outline-none w-[28rem] max-w-full"
                        type="text"
                        value={v === null ? '' : String(v)}
                        onChange={(e) => onChange(k, e.target.value)}
                      />
                    )}
                  </td>
                  <td className="p-2 opacity-70">{typ}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={saveAll}
          className="rounded-2xl px-4 py-2 border border-white/10 bg-white/10 hover:bg-white/20 active:scale-[0.99]"
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={load}
          className="rounded-2xl px-4 py-2 border border-white/10 bg-white/10 hover:bg-white/20 active:scale-[0.99]"
          disabled={saving}
        >
          Revert
        </button>
        {!!msg && <div className="text-xs text-emerald-300">{msg}</div>}
        {!!err && <div className="text-xs text-red-300">{err}</div>}
      </div>
    </section>
  );
}
