"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Single browser Supabase client for the app.
 *
 * - Uses anon key only (no service_role).
 * - Sessions are stored in browser storage and reused everywhere.
 */

let browserClient: SupabaseClient | null = null;

function ensureClient(): SupabaseClient {
  if (!browserClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Check your .env.local."
      );
    }

    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return browserClient;
}

// Preferred API
export function getSupabaseClient(): SupabaseClient {
  return ensureClient();
}

// Back-compat alias (some files may import this)
export function getSupabase(): SupabaseClient {
  return ensureClient();
}

// Legacy constant for older imports
export const supabase: SupabaseClient = ensureClient();
