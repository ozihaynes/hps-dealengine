'use client';
import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import AuthGate from '@/components/AuthGate';

type Policy = {
  id: string;
  posture: string;
  is_active: boolean;
  policy_json?: Record<string, unknown>;
  tokens?: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

type VersionsRow = {
  version_id: string;
  org_id: string;
  posture: string;
  actor_user_id: string;
  created_at: string;
  change_summary: string | null;
};

export default function SettingsPage() {
  const [posture, setPosture] = React.useState<'conservative' | 'base' | 'aggressive'>('base');
  const [policy, setPolicy] = React.useState<Policy | null>(null);
  const [versions, setVersions] = React.useState<VersionsRow[]>([]);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function load() {
    setLoading(true);
    setErr(null);
    setPolicy(null);
    setVersions([]);

    // 1) Active policy via Edge Function
    const { data, error } = await supabase.functions.invoke('v1-policy-get', { body: { posture } });
    if (error) {
      setErr(error.message ?? 'invoke_error');
      setLoading(false);
      return;
    }
    setPolicy((data?.policy ?? null) as Policy | null);

    // 2) Latest versions via PostgREST view (RLS applies)
    const { data: vRows, error: vErr } = await supabase
      .from('policy_versions_api')
      .select('version_id,org_id,posture,actor_user_id,created_at,change_summary')
      .order('created_at', { ascending: false })
      .limit(5);
    if (vErr) setErr(vErr.message ?? 'versions_error');
    setVersions(vRows ?? []);

    setLoading(false);
  }

  React.useEffect(() => {
    // runs only when this component is rendered (AuthGate shows it post-sign-in)
    load().catch((e) => setErr(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posture]);

  return (
    <AuthGate>
      <main className="mx-auto max-w-4xl p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Settings — Business Policy</h1>

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
        </div>

        {err ? <pre className="text-red-600 whitespace-pre-wrap">{err}</pre> : null}

        <section className="space-y-2">
          <h2 className="font-semibold">Active Policy</h2>
          <pre className="bg-gray-950 text-gray-200 p-3 rounded overflow-auto">
            {JSON.stringify(policy, null, 2)}
          </pre>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">Quick Save Tokens</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm">AIV_CAP_PCT</span>
              <input
                id="tok-aiv"
                type="number"
                step="0.01"
                className="border rounded p-2"
                defaultValue={
                  typeof (policy?.tokens as any)?.AIV_CAP_PCT === 'number'
                    ? String((policy!.tokens as any).AIV_CAP_PCT)
                    : '0.97'
                }
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm">CARRY_MONTHS_CAP</span>
              <input
                id="tok-carry"
                type="number"
                step="1"
                className="border rounded p-2"
                defaultValue={
                  typeof (policy?.tokens as any)?.CARRY_MONTHS_CAP === 'number'
                    ? String((policy!.tokens as any).CARRY_MONTHS_CAP)
                    : '5'
                }
              />
            </label>

            <div className="flex items-end">
              <button
                className="rounded px-4 py-2 border"
                onClick={async () => {
                  const aiv = Number(
                    (document.getElementById('tok-aiv') as HTMLInputElement)?.value
                  );
                  const carry = Number(
                    (document.getElementById('tok-carry') as HTMLInputElement)?.value
                  );
                  const { error } = await supabase.functions.invoke('v1-policy-put', {
                    body: {
                      posture,
                      change_summary:
                        'Set AIV_CAP_PCT and CARRY_MONTHS_CAP via Settings Quick Save.',
                      tokens: { AIV_CAP_PCT: aiv, CARRY_MONTHS_CAP: carry },
                    },
                  });
                  if (error) {
                    alert('Save failed: ' + error.message);
                    return;
                  }
                  await load();
                }}
              >
                Save
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">Latest Versions (max 5)</h2>
          <pre className="bg-gray-950 text-gray-200 p-3 rounded overflow-auto">
            {JSON.stringify(versions, null, 2)}
          </pre>
        </section>
      </main>
    </AuthGate>
  );
}
