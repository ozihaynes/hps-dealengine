'use client';
import { getSupabase } from './supabaseClient';

async function sha256Hex(s: string): Promise<string> {
  const enc = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  const b = Array.from(new Uint8Array(buf));
  return b.map((x) => x.toString(16).padStart(2, '0')).join('');
}

export type AnalyzeInput = {
  org_id: string;
  deal: { aiv: number; dom: number; dom_zip?: number };
  options?: { trace?: boolean };
};

export async function analyze(input: AnalyzeInput) {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('v1-analyze', { body: input });
  if (error) throw error;
  return data as {
    ok: boolean;
    posture: 'conservative' | 'base' | 'aggressive';
    outputs: Record<string, unknown>;
    trace: Array<{
      id: string;
      label: string;
      formula: string;
      inputs: any;
      tokens: any;
      output: any;
    }>;
    tokens_used?: Record<string, unknown>;
    infoNeeded?: string[];
  };
}

export async function saveRun(org_id: string, analyzeInput: AnalyzeInput, analyzeResp: any) {
  const supabase = getSupabase();

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!userRes?.user) throw new Error('No user session; cannot save run.');
  const created_by = userRes.user.id;

  const inputJson = JSON.stringify(analyzeInput);
  const outputsJson = JSON.stringify(analyzeResp.outputs ?? {});
  const traceJson = JSON.stringify(analyzeResp.trace ?? []);

  const input_hash = await sha256Hex(inputJson);
  const output_hash = await sha256Hex(outputsJson);

  // Fetch latest policy version id for this org/posture (most recent snapshot)
  const { data: vers, error: vErr } = await supabase
    .from('policy_versions')
    .select('id')
    .eq('org_id', org_id)
    .eq('posture', analyzeResp.posture)
    .order('created_at', { ascending: false })
    .limit(1);
  if (vErr) throw vErr;
  const policy_version_id = vers?.[0]?.id ?? null;

  const payload = {
    org_id,
    created_by,
    posture: analyzeResp.posture,
    policy_version_id,
    input: JSON.parse(inputJson),
    output: JSON.parse(outputsJson),
    trace: JSON.parse(traceJson),
    input_hash,
    output_hash,
  };

  const { data, error } = await supabase.from('runs').insert([payload]).select().single();
  if (error) throw error;

  const details = {
    slices: (analyzeResp.trace ?? []).map((t: any) => t.id),
    posture: analyzeResp.posture,
    input_hash,
    output_hash,
  };
  const { error: auditErr } = await supabase.from('audit_logs').insert([
    {
      org_id,
      actor_user_id: created_by,
      action: 'analyze.run.created',
      entity: 'run',
      entity_id: data.id,
      details,
    },
  ]);
  if (auditErr) throw auditErr;

  return data;
}
