'use client';
import React from 'react';
import { getSupabase } from '@/lib/supabaseClient';

type Row = {
  version_id: string;
  org_id: string;
  posture: 'conservative' | 'base' | 'aggressive';
  actor_user_id: string;
  created_at: string;
  change_summary: string | null;
};

export default function PolicyVersions() {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        const email = process.env.NEXT_PUBLIC_DEV_EMAIL!;
        const password = process.env.NEXT_PUBLIC_DEV_PASSWORD!;
        if (email && password) await supabase.auth.signInWithPassword({ email, password });
      }
      const { data, error } = await supabase
        .from('policy_versions_api')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) setErr(error.message);
      else setRows((data ?? []) as Row[]);
    })();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Policy Versions</h1>
      {err && <pre className="text-red-600">{err}</pre>}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.version_id} className="rounded-2xl border p-4">
            <div className="text-sm text-gray-500">
              {new Date(r.created_at).toLocaleString()} • {r.posture}
            </div>
            <div className="font-mono text-xs break-all">{r.version_id}</div>
            {r.change_summary && <div className="mt-1">{r.change_summary}</div>}
          </li>
        ))}
        {rows.length === 0 && <li className="text-gray-500">No versions yet.</li>}
      </ul>
    </div>
  );
}
