'use client';
import React from 'react';
import { supabase } from '@/lib/supabaseClient';

type Props = { posture: 'conservative' | 'base' | 'aggressive' };

export default function PolicyRibbon({ posture }: Props) {
  const [tokens, setTokens] = React.useState<Record<string, unknown>>({});
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase.functions.invoke('v1-policy-get', { body: { posture } });
    if (error) setErr(error.message ?? 'invoke_error');
    setTokens((data?.policy?.tokens ?? {}) as Record<string, unknown>);
    setLoading(false);
  }

  React.useEffect(() => {
    load().catch((e) => setErr(String(e)));
  }, [posture]);

  const aivCap = tokens?.AIV_CAP_PCT;
  const carryCap = tokens?.CARRY_MONTHS_CAP;

  return (
    <div className="flex items-center justify-between rounded border px-3 py-2">
      <div className="text-sm">
        <span className="font-medium">Posture:</span> {posture}
        <span className="mx-2">|</span>
        <span className="font-medium">AIV_CAP_PCT:</span> {String(aivCap ?? '—')}
        <span className="mx-2">|</span>
        <span className="font-medium">CARRY_MONTHS_CAP:</span> {String(carryCap ?? '—')}
      </div>
      <button onClick={load} disabled={loading} className="border rounded px-2 py-1 text-sm">
        {loading ? 'Refreshing…' : 'Refresh'}
      </button>
      {err ? <span className="text-xs text-red-600 ml-2">{err}</span> : null}
    </div>
  );
}
