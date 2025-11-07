'use client';
import React from 'react';
import { analyze, saveRun, type AnalyzeInput } from '@/app/../lib/edge';
import { getSupabase } from '@/app/../lib/supabaseClient';

export default function UnderwriteDebugPage() {
  const [aiv, setAiv] = React.useState<number>(300000);
  const [dom, setDom] = React.useState<number>(45);
  const [domZip, setDomZip] = React.useState<number>(45);
  const [resp, setResp] = React.useState<any>(null);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Dev-only bootstrap using NEXT_PUBLIC_DEV_EMAIL/PASSWORD if no session
  React.useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        const email = process.env.NEXT_PUBLIC_DEV_EMAIL!;
        const password = process.env.NEXT_PUBLIC_DEV_PASSWORD!;
        if (email && password) await supabase.auth.signInWithPassword({ email, password });
      }
    })();
  }, []);

  const org_id = '6f3f2b0e-7f24-4f9d-a9e1-7c6e2e7160a2';

  async function onAnalyze() {
    setError(null);
    setResp(null);
    try {
      const input: AnalyzeInput = {
        org_id,
        deal: { aiv: Number(aiv), dom: Number(dom), dom_zip: Number(domZip) },
        options: { trace: true },
      };
      const r = await analyze(input);
      setResp(r);
    } catch (e: any) {
      setError(e?.message ?? 'Analyze failed');
    }
  }

  async function onSave() {
    if (!resp) return;
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      const input: AnalyzeInput = {
        org_id,
        deal: { aiv: Number(aiv), dom: Number(dom), dom_zip: Number(domZip) },
        options: { trace: true },
      };
      const row = await saveRun(org_id, input, resp);
      setSaved(row);
    } catch (e: any) {
      setError(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Underwrite / Debug</h1>

      <div className="grid grid-cols-3 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-500">AIV</span>
          <input
            className="border rounded p-2"
            type="number"
            value={aiv}
            onChange={(e) => setAiv(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-500">DOM</span>
          <input
            className="border rounded p-2"
            type="number"
            value={dom}
            onChange={(e) => setDom(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-500">DOM (ZIP)</span>
          <input
            className="border rounded p-2"
            type="number"
            value={domZip}
            onChange={(e) => setDomZip(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="flex gap-3">
        <button onClick={onAnalyze} className="px-4 py-2 rounded bg-black text-white">
          Analyze
        </button>
        <button
          onClick={onSave}
          disabled={!resp || saving}
          className="px-4 py-2 rounded bg-gray-900 text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save run'}
        </button>
      </div>

      {error && <pre className="text-red-600 whitespace-pre-wrap">{error}</pre>}

      {resp && (
        <div className="space-y-4">
          <div className="rounded border p-4">
            <h2 className="font-semibold mb-2">Outputs</h2>
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(resp.outputs, null, 2)}
            </pre>
          </div>
          <div className="rounded border p-4">
            <h2 className="font-semibold mb-2">Trace</h2>
            <ul className="list-disc pl-5">
              {resp.trace?.map((t: any) => (
                <li key={t.id} className="mb-2">
                  <div className="font-mono text-sm">{t.id}</div>
                  <div className="text-xs text-gray-500">{t.formula}</div>
                </li>
              ))}
            </ul>
          </div>
          {saved && (
            <div className="rounded border p-4">
              <h2 className="font-semibold mb-2">Saved Run</h2>
              <div className="text-sm">
                ID: <code>{saved.id}</code>
              </div>
              <a href={`/runs/${saved.id}`} className="text-blue-600 underline text-sm">
                View run detail
              </a>
              <pre className="text-sm whitespace-pre-wrap mt-3">
                {JSON.stringify(saved, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
