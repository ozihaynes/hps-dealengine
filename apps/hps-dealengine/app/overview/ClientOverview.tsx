'use client';
import React from 'react';
import AuthGate from '@/components/AuthGate';
import { supabase } from '@/lib/supabaseClient';
import PolicyRibbon from '@/components/PolicyRibbon';

type Policy = {
  id: string;
  posture: 'conservative' | 'base' | 'aggressive';
  is_active: boolean;
  tokens?: Record<string, unknown>;
  policy_json?: Record<string, unknown>;
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

export default function ClientOverview() {
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
    const a = await supabase.functions.invoke('v1-policy-get', { body: { posture } });
    if (a.error) {
      setErr(a.error.message ?? 'invoke_error');
      setLoading(false);
      return;
    }
    setPolicy((a.data?.policy ?? null) as Policy | null);

    const v = await supabase
      .from('policy_versions_api')
      .select('version_id,org_id,posture,actor_user_id,created_at,change_summary')
      .order('created_at', { ascending: false })
      .limit(5);
    if (v.error) setErr(v.error.message ?? 'versions_error');
    setVersions(v.data ?? []);
    setLoading(false);
  }

  React.useEffect(() => {
    load().catch((e) => setErr(String(e)));
  }, [posture]);

  return (
    <AuthGate>
      <main className="mx-auto max-w-5xl p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Overview</h1>

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
          <h2 className="font-semibold">Recent Versions</h2>
          <pre className="bg-gray-950 text-gray-200 p-3 rounded overflow-auto">
            {JSON.stringify(versions, null, 2)}
          </pre>
        </section>
      </main>
    </AuthGate>
  );
}
{
  /* Dev utility link */
}
<div className="mt-3">
  <a href="/runs" className="text-blue-600 underline text-sm">
    Runs
  </a>
</div>;
