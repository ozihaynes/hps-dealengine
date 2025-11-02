'use client';

import { useEffect, useMemo, useState } from 'react';

type TokenMap = Record<string, string | number | boolean>;

export default function SettingsTokens() {
  const [tokens, setTokens] = useState<TokenMap | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [addKey, setAddKey] = useState('');
  const [addVal, setAddVal] = useState('');

  // Load
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/tokens', { headers: { Accept: 'application/json' } });
        if (!r.ok) throw new Error(`GET failed (${r.status})`);
        const j = await r.json();
        if (alive) setTokens(j?.tokens ?? {});
      } catch (e: any) {
        if (alive) setErr(e?.message ?? 'Failed to load tokens');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const entries = useMemo(() => {
    const t = tokens ?? {};
    return Object.keys(t)
      .sort()
      .map((k) => [k, t[k]] as const);
  }, [tokens]);

  function setToken(k: string, v: string) {
    setTokens((prev) => {
      const next = { ...(prev ?? {}) };
      // try to coerce numbers
      const n = Number(v);
      next[k] = Number.isFinite(n) && v.trim() !== '' ? n : v;
      return next;
    });
  }

  function removeToken(k: string) {
    setTokens((prev) => {
      const next = { ...(prev ?? {}) };
      delete next[k];
      return next;
    });
  }

  function addToken() {
    const k = addKey.trim();
    if (!k) return;
    setTokens((prev) => {
      const next = { ...(prev ?? {}) };
      const n = Number(addVal);
      (next as any)[k] = Number.isFinite(n) && addVal.trim() !== '' ? n : addVal;
      return next;
    });
    setAddKey('');
    setAddVal('');
  }

  async function save() {
    if (!tokens) return;
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const r = await fetch('/api/tokens', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(tokens),
      });
      if (!r.ok) throw new Error(`PUT failed (${r.status})`);
      const j = await r.json();
      setTokens(j?.tokens ?? tokens);
      setMsg('Saved ✓');
    } catch (e: any) {
      setErr(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!tokens && !err) return <div className="text-sm opacity-70">Loading tokens…</div>;
  if (err) return <div className="text-sm text-red-300">Error: {err}</div>;

  return (
    <section className="rounded-2xl p-5 border border-white/10 bg-white/5 backdrop-blur space-y-4">
      <div className="text-xl font-semibold">Policy Tokens</div>

      {/* List */}
      <div className="text-xs overflow-auto rounded-lg border border-white/10">
        <table className="w-full">
          <thead className="bg-white/10">
            <tr>
              <th className="text-left p-2">Token</th>
              <th className="text-left p-2">Value</th>
              <th className="text-left p-2" />
            </tr>
          </thead>
          <tbody>
            {entries.map(([k, v]) => (
              <tr key={k} className="odd:bg-white/5">
                <td className="p-2 font-mono text-[11px]">{k}</td>
                <td className="p-2">
                  <input
                    className="w-full rounded-md px-2 py-1 bg-black/30 border border-white/10 focus:outline-none text-sm"
                    value={String(v)}
                    onChange={(e) => setToken(k, e.target.value)}
                  />
                </td>
                <td className="p-2">
                  <button
                    onClick={() => removeToken(k)}
                    className="text-xs rounded-md px-2 py-1 border border-white/10 bg-white/10 hover:bg-white/20"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td className="p-2 text-sm opacity-70" colSpan={3}>
                  No tokens yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <label className="flex flex-col gap-1">
          <span className="text-sm opacity-80">New token (e.g., {'<AIV_CAP_PCT>'})</span>
          <input
            className="rounded-md px-2 py-1 bg-black/30 border border-white/10 focus:outline-none"
            value={addKey}
            onChange={(e) => setAddKey(e.target.value)}
            placeholder="<TOKEN_NAME>"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm opacity-80">Value (number or text)</span>
          <input
            className="rounded-md px-2 py-1 bg-black/30 border border-white/10 focus:outline-none"
            value={addVal}
            onChange={(e) => setAddVal(e.target.value)}
            placeholder="0.97"
          />
        </label>
        <button
          onClick={addToken}
          className="rounded-2xl px-4 py-2 border border-white/10 bg-white/10 hover:bg-white/20 active:scale-[0.99]"
        >
          Add token
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          className="rounded-2xl px-4 py-2 border border-white/10 bg-white/10 hover:bg-white/20 active:scale-[0.99]"
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {!!msg && <div className="text-xs text-emerald-300">{msg}</div>}
        {!!err && <div className="text-xs text-red-300">{err}</div>}
      </div>
    </section>
  );
}
