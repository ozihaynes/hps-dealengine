'use client';
import { useEffect, useRef, useState } from 'react';
import { fetchPolicy } from '../lib/api';

type Props = { value: any; onLoad: (v: any) => void };
const KEY = 'hpsde_sandbox_presets_v1';

function readAll(): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

export default function PresetBar({ value, onLoad }: Props) {
  const [presets, setPresets] = useState<Record<string, any>>({});
  const [name, setName] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setPresets(readAll());
  }, []);

  function save() {
    if (!name) return;
    const next = { ...readAll(), [name]: value };
    localStorage.setItem(KEY, JSON.stringify(next));
    setPresets(next);
    setName('');
  }

  function load(n: string) {
    const p = readAll()[n];
    if (p) onLoad(p);
  }

  function reset() {
    onLoad({});
  }

  async function reloadFromServer() {
    try {
      const d = await fetchPolicy();
      onLoad(d ?? {});
    } catch (e) {
      console.error('Reload server policy failed:', e);
    }
  }

  function exportJSON() {
    try {
      const blob = new Blob([JSON.stringify(value ?? {}, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dt = new Date().toISOString().replace(/[:.]/g, '-');
      a.download = `hps-sandbox-policy-${dt}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    }
  }

  function openImport() {
    fileRef.current?.click();
  }

  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const merged = { ...(value ?? {}), ...(parsed ?? {}) };
        onLoad(merged);
      } catch (err) {
        console.error('Invalid JSON:', err);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(f);
  }

  function clearAllPresets() {
    localStorage.removeItem(KEY);
    setPresets({});
  }

  const btn = 'border border-white/15 rounded-xl px-3 py-2 bg-white/5 hover:bg-white/10 text-sm';

  return (
    <div className="panel p-3 rounded-2xl flex flex-wrap items-center gap-2">
      <input
        className="input w-56"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Preset name…"
        aria-label="Preset name"
      />
      <button className={btn} onClick={save} title="Save current settings to a named local preset">
        Save as Preset
      </button>

      <div className="ml-2 flex items-center gap-2">
        <button className={btn} onClick={exportJSON} title="Download current policy as JSON">
          Export JSON
        </button>
        <button className={btn} onClick={openImport} title="Merge a JSON file into current policy">
          Import JSON
        </button>
        <input ref={fileRef} type="file" accept="application/json" onChange={onImportFile} hidden />
        <button className={btn} onClick={reloadFromServer} title="Reload policy from server">
          Reload Server Policy
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <select
          className="input w-56"
          onChange={(e) => load(e.target.value)}
          defaultValue=""
          aria-label="Load preset"
        >
          <option value="" disabled>
            Load preset…
          </option>
          {Object.keys(presets)
            .sort()
            .map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
        </select>
        <button className={btn} onClick={reset} title="Clear form values">
          Reset Form
        </button>
        <button className={btn} onClick={clearAllPresets} title="Delete all saved presets">
          Clear Presets
        </button>
      </div>
    </div>
  );
}
