'use client';

import { useEffect, useState } from 'react';

type Prefs = {
  autorun_debounce_ms: number;
  default_tab: string;
  density: string;
};

export default function SettingsPrefs() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/user-prefs', { headers: { Accept: 'application/json' } });
        if (!r.ok) throw new Error(`GET failed (${r.status})`);
        const j = await r.json();
        if (alive) setPrefs(j?.prefs ?? null);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? 'Failed to load prefs');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function save() {
    if (!prefs) return;
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await fetch('/api/user-prefs', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      if (!r.ok) throw new Error(`PUT failed (${r.status})`);
      const j = await r.json();
      setPrefs(j?.prefs ?? prefs);
      setMsg('Saved ✓');
    } catch (e: any) {
      setErr(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!prefs && !err) return <div className="text-sm opacity-70">Loading prefs…</div>;
  if (err) return <div className="text-sm text-red-300">Error: {err}</div>;

  return (
    <section className="rounded-2xl p-5 border border-white/10 bg-white/5 backdrop-blur space-y-4">
      <div className="text-xl font-semibold">User Preferences</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-80">Autorun debounce (ms)</span>
          <input
            className="rounded-xl px-3 py-2 bg-black/30 border border-white/10 focus:outline-none"
            type="number"
            min={0}
            value={Number.isFinite(prefs!.autorun_debounce_ms) ? prefs!.autorun_debounce_ms : 450}
            onChange={(e) =>
              setPrefs((p) =>
                p ? { ...p, autorun_debounce_ms: Math.max(0, Number(e.target.value || 0)) } : p
              )
            }
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-80">Default tab</span>
          <select
            className="rounded-xl px-3 py-2 bg-black/30 border border-white/10 focus:outline-none"
            value={prefs!.default_tab}
            onChange={(e) => setPrefs((p) => (p ? { ...p, default_tab: e.target.value } : p))}
          >
            <option value="underwrite">underwrite</option>
            <option value="settings">settings</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-80">Density</span>
          <select
            className="rounded-xl px-3 py-2 bg-black/30 border border-white/10 focus:outline-none"
            value={prefs!.density}
            onChange={(e) => setPrefs((p) => (p ? { ...p, density: e.target.value } : p))}
          >
            <option value="comfortable">comfortable</option>
            <option value="compact">compact</option>
          </select>
        </label>
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
