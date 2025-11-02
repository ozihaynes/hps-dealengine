/**
 * v1-policy (Deno / Supabase Edge Function)
 * - Requires Authorization: Bearer <user_jwt>
 * - GET  ?posture=base|conservative|aggressive  -> latest policy row for caller
 * - PUT  same query, body { tokens: {...}, metadata?: {...} } -> insert new row
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...extra },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer '))
    return json({ error: { code: '401', message: 'Missing Authorization bearer token' } }, 401);

  // Forward caller JWT so RLS applies in DB (official pattern)
  // https://supabase.com/docs/guides/functions/auth#using-supabase-auth-within-edge-functions
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user)
    return json({ error: { code: '401', message: 'Invalid or expired token' } }, 401);

  const userId = auth.user.id;
  const url = new URL(req.url);
  const posture = (url.searchParams.get('posture') ?? 'base').toLowerCase();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('policies')
      .select('id, org_id, posture, tokens, metadata, created_at')
      .eq('org_id', userId)
      .eq('posture', posture)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return json({ error: { code: '500', message: error.message } }, 500);
    if (!data) {
      return json(
        {
          error: { code: '404', message: 'No policy found' },
          infoNeeded: ['PUT /v1-policy?posture=... with a { tokens: {...} } body to create one'],
        },
        404
      );
    }
    return json({ version: 'v1', policy: data }, 200);
  }

  if (req.method === 'PUT') {
    let body: { tokens?: unknown; metadata?: unknown } | null = null;
    try {
      body = await req.json();
    } catch (_) {}
    if (!body?.tokens || typeof body.tokens !== 'object') {
      return json(
        {
          error: { code: '400', message: 'Body must include tokens object' },
          infoNeeded: ['tokens'],
        },
        400
      );
    }

    const row = {
      org_id: userId,
      posture,
      tokens: body.tokens as Record<string, unknown>,
      metadata: (body.metadata ?? null) as Record<string, unknown> | null,
    };

    const { data, error } = await supabase
      .from('policies')
      .insert(row)
      .select('id, org_id, posture, tokens, metadata, created_at')
      .single();

    if (error) return json({ error: { code: '500', message: error.message } }, 500);
    return json({ version: 'v1', policy: data }, 201);
  }

  return json({ error: { code: '405', message: 'Method Not Allowed' } }, 405);
});
