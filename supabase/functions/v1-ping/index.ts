/**
 * v1-ping (Deno / Supabase Edge Function)
 * Requires Authorization: Bearer <user_jwt>
 * Returns version, now, and the authenticated user id.
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type ApiError = { ok?: false; error: { code: string; message: string }; infoNeeded?: string[] };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return json(
      { error: { code: '401', message: 'Missing Authorization bearer token' } } satisfies ApiError,
      401
    );
  }

  // Forward caller JWT so RLS can apply inside Postgres calls
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!, // provided by local stack or --env-file
    Deno.env.get('SUPABASE_ANON_KEY')!, // provided by local stack or --env-file
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return json(
      { error: { code: '401', message: 'Invalid or expired token' } } satisfies ApiError,
      401
    );
  }

  return json({ version: 'v1', now: new Date().toISOString(), user: { id: data.user.id } });
});
