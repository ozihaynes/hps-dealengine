import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
type Json = Record<string, unknown> | null;

type Body = {
  posture?: 'conservative' | 'base' | 'aggressive';
  change_summary?: string | null;
  tokens?: Record<string, unknown>;
};

function bad(status: number, msg: string) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return bad(405, 'Method not allowed');

  const auth = req.headers.get('Authorization') ?? '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  let userId = null as string | null;
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1] ?? ''));
    userId = payload?.sub ?? null;
  } catch {
    /* noop */
  }

  const { posture, change_summary, tokens }: Body = await req.json().catch(() => ({}) as Body);
  if (!posture || !['conservative', 'base', 'aggressive'].includes(posture))
    return bad(422, 'Invalid posture');
  if (!tokens || typeof tokens !== 'object') return bad(422, 'Missing tokens object');

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(url, anon, { global: { headers: { Authorization: auth } } });

  // 1) Fetch active policy row under caller RLS
  const { data: rows, error: selErr } = await supabase
    .from('policies')
    .select('id, org_id, posture, is_active, tokens, policy_json')
    .eq('posture', posture)
    .eq('is_active', true)
    .limit(1);

  if (selErr) return bad(500, `select_error: ${selErr.message}`);
  const current = rows?.[0];
  if (!current) return bad(404, 'No active policy for this posture');

  // 2) Merge tokens (new overrides existing)
  const mergedTokens = { ...(current.tokens ?? {}), ...(tokens ?? {}) };

  // Optional: carry a simple policy_json snapshot; expand later as needed
  const snapshot: Json = {
    posture: current.posture,
    is_active: true,
    tokens: mergedTokens,
  };

  // 3) Update policy in place (RLS must allow this for the caller)
  const { error: updErr } = await supabase
    .from('policies')
    .update({ tokens: mergedTokens, policy_json: snapshot })
    .eq('id', current.id)
    .eq('is_active', true);

  if (updErr) return bad(403, `update_forbidden_or_failed: ${updErr.message}`);

  // 4) Version snapshot (audit)
  const { error: insErr } = await supabase.from('policy_versions').insert([
    {
      org_id: current.org_id,
      posture: current.posture,
      policy_json: snapshot,
      change_summary: change_summary ?? 'Tokens updated via v1-policy-put',
      created_by: userId,
    },
  ]);

  if (insErr) {
    // Non-fatal for user flow; return 207 multi-status style notice
    return new Response(
      JSON.stringify({
        ok: true,
        policy: { id: current.id, posture: current.posture, tokens: mergedTokens },
        warn: `version_insert_failed: ${insErr.message}`,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      policy: { id: current.id, posture: current.posture, tokens: mergedTokens },
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
