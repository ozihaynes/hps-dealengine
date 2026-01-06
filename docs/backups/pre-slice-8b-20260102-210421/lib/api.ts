// apps/hps-dealengine/lib/api.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Settings } from '@hps-internal/contracts';
import { createClient } from '@supabase/supabase-js';

// ───────────────────────────────────────────────────────────────────────────────
// Supabase client (browser-safe). Requires NEXT_PUBLIC_* envs to be set.
// Docs: https://supabase.com/docs/reference/javascript/functions-invoke
// ───────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Fail fast with a clear message at dev time
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.'
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Optional posture default. Change if your runtime sets a different default.
const DEFAULT_POSTURE = (process.env.NEXT_PUBLIC_DEFAULT_POSTURE ?? 'base') as string;

// Small helper to normalize `{ ok, ... }` envelopes coming back from Edge Functions.
function unwrapOk<T = unknown>(payload: any): T {
  if (payload && typeof payload === 'object') {
    if ('ok' in payload && payload.ok === true && 'policy' in payload) {
      return payload.policy as T;
    }
    if ('ok' in payload && payload.ok === true && 'result' in payload) {
      return payload.result as T;
    }
  }
  return payload as T;
}

// ───────────────────────────────────────────────────────────────────────────────
// Policy: GET via Edge Function `v1-policy-get`
// Returns the Settings object for the given posture (default: "base").
// ───────────────────────────────────────────────────────────────────────────────
export async function fetchPolicy(posture: string = DEFAULT_POSTURE): Promise<Settings> {
  const { data, error } = await supabase.functions.invoke('v1-policy-get', {
    body: { posture },
  });

  if (error) {
    // Edge Functions return a rich error; surface message cleanly.
    throw new Error(`Failed to load policy: ${error.message}`);
  }

  const unwrapped = unwrapOk<Settings>(data);
  if (!unwrapped || typeof unwrapped !== 'object') {
    throw new Error('Failed to load policy: empty/invalid response');
  }
  return unwrapped as Settings;
}

// ───────────────────────────────────────────────────────────────────────────────
// Policy: PUT via Edge Function `v1-policy-put`
// Persists a Settings object for the given posture (default: "base") and returns
// the saved policy (authoritative echo from the DB).
// NOTE: Ensure you have deployed a matching Edge Function `v1-policy-put`.
// ───────────────────────────────────────────────────────────────────────────────
export async function putPolicy(
  policy: Settings,
  posture: string = DEFAULT_POSTURE
): Promise<Settings> {
  const { data, error } = await supabase.functions.invoke('v1-policy-put', {
    body: { posture, policy },
  });

  if (error) {
    throw new Error(`Failed to save policy: ${error.message}`);
  }

  const unwrapped = unwrapOk<Settings>(data);
  if (!unwrapped || typeof unwrapped !== 'object') {
    throw new Error('Failed to save policy: empty/invalid response');
  }
  return unwrapped as Settings;
}

// ───────────────────────────────────────────────────────────────────────────────
// Analyze: POST via Edge Function `v1-analyze`
// Normalizes several possible return shapes:
//  • { ok: true, result: {...} }
//  • direct object like { outputs, infoNeeded, trace }
//  • any engine-specific envelope you return later
// ───────────────────────────────────────────────────────────────────────────────
export async function analyze(deal: any, policy?: Settings | null): Promise<any> {
  const { data, error } = await supabase.functions.invoke('v1-analyze', {
    body: { deal, policy: policy ?? undefined },
  });

  if (error) {
    throw new Error(`Analyze failed: ${error.message}`);
  }

  // Prefer `{ ok, result }`, otherwise pass through the object your function returns.
  const normalized = unwrapOk<any>(data);
  return normalized ?? null;
}
