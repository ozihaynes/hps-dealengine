// apps/hps-dealengine/lib/edge.ts
'use client';

import { getSupabase } from '@/lib/supabaseClient';

async function sha256Hex(s: string): Promise<string> {
  const enc = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  const bytes = Array.from(new Uint8Array(buf));
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function ensureSession() {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    const email = process.env.NEXT_PUBLIC_DEV_EMAIL;
    const password = process.env.NEXT_PUBLIC_DEV_PASSWORD;
    if (email && password) {
      await supabase.auth.signInWithPassword({ email, password });
    }
  }
  return supabase;
}

export type AnalyzeInput = {
  org_id: string;
  deal: { aiv: number; dom: number; dom_zip?: number };
  options?: { trace?: boolean };
};

type AnalyzeResponse = {
  ok: boolean;
  posture: 'conservative' | 'base' | 'aggressive';
  outputs: Record<string, unknown>;
  trace: Array<{
    id: string;
    label: string;
    formula?: string;
    inputs?: any;
    tokens?: any;
    output?: any;
  }>;
  tokens_used?: Record<string, unknown>;
  infoNeeded?: string[];
};

export async function analyze(input: AnalyzeInput): Promise<AnalyzeResponse> {
  const supabase = await ensureSession();
  const { data, error } = await supabase.functions.invoke('v1-analyze', {
    body: input,
  });
  if (error) throw new Error(error.message ?? 'Edge function failed');
  return data as AnalyzeResponse;
}

export async function saveRun(
  org_id: string,
  analyzeInput: AnalyzeInput,
  analyzeResp: AnalyzeResponse
) {
  const supabase = await ensureSession();

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!userRes?.user) throw new Error('No user session; cannot save run.');
  const created_by = userRes.user.id;

  const inputJson = JSON.stringify(analyzeInput);
  const outputsJson = JSON.stringify(analyzeResp.outputs ?? {});
  const traceJson = JSON.stringify(analyzeResp.trace ?? []);

  const input_hash = await sha256Hex(inputJson);
  const output_hash = await sha256Hex(outputsJson);

  const runPayload = {
    org_id,
    created_by,
    posture: analyzeResp.posture,
    policy_version_id: null as string | null,
    input: JSON.parse(inputJson),
    output: JSON.parse(outputsJson),
    trace: JSON.parse(traceJson),
    input_hash,
    output_hash,
  };

  const { data: runRow, error: runErr } = await supabase
    .from('runs')
    .insert([runPayload])
    .select()
    .single();
  if (runErr) throw runErr;

  const details = {
    slices: (analyzeResp.trace ?? []).map((t) => t.id),
    posture: analyzeResp.posture,
    input_hash,
    output_hash,
  };

  await supabase.from('audit_logs').insert([
    {
      org_id,
      actor_user_id: created_by,
      action: 'analyze.run.created',
      entity: 'run',
      entity_id: runRow.id,
      details,
    },
  ]);

  return runRow;
}
