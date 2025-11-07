'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) _client = createClient(url, anon);
  return _client;
}

/** Named export for legacy imports: `import { supabase } from "@/lib/supabaseClient"` */
export const supabase = getSupabase();
