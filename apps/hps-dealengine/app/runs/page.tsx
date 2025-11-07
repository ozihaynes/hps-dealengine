'use client';
import React from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabaseClient';

export default function RunsPage() {
  const [rows, setRows] = React.useState<any[]>([]);

  React.useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const { data: s } = await supabase.auth.getSession();
      if (!s.session && process.env.NEXT_PUBLIC_DEV_EMAIL && process.env.NEXT_PUBLIC_DEV_PASSWORD) {
        await supabase.auth.signInWithPassword({
          email: process.env.NEXT_PUBLIC_DEV_EMAIL,
          password: process.env.NEXT_PUBLIC_DEV_PASSWORD,
        });
      }
      const { data, error } = await supabase
        .from('runs')
        .select('id, created_at, posture, input_hash, output_hash')
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error && data) setRows(data as any[]);
    })();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Runs</h1>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded border p-3">
            <div className="text-sm">{new Date(r.created_at).toLocaleString()}</div>
            <div className="text-xs">posture: {r.posture}</div>
            <div className="text-xs font-mono break-all">in: {r.input_hash}</div>
            <div className="text-xs font-mono break-all">out: {r.output_hash}</div>
            <Link className="text-blue-600 underline text-sm" href={`/runs/${r.id}`}>
              View
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
