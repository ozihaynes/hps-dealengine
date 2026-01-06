import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client factory (no service_role).
 *
 * - Uses anon key only; caller must supply a user access token if they need
 *   RLS-backed requests on behalf of a user.
 * - This helper is intended for Route Handlers / server components that
 *   receive a bearer token (e.g., from cookies or headers) and want a
 *   shared pattern for constructing the client without ever reaching for
 *   service_role.
 */
export function createServerClient(accessToken?: string): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Check your env."
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}
