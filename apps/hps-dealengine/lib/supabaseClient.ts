"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Build-safe singleton: during SSR/pre-render (no window) or when envs are missing,
 * return a tiny no-op shim so Next.js can statically generate pages without throwing.
 * At runtime in the browser, we require the real env vars.
 */
function makeNoopClient(): SupabaseClient {
  const noop = async (..._args: any[]) => {
    // Keep it quiet during build; callers already catch errors.
    return {} as any;
  };
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null } as any),
      signInWithPassword: async () =>
        ({ data: { session: null }, error: new Error("Supabase env missing") } as any),
    },
    functions: {
      invoke: async () => {
        throw new Error("Supabase env missing (functions.invoke)");
      },
    },
  } as unknown as SupabaseClient;
}

export const supabase: SupabaseClient = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // On the server/build or if envs are absent, don't throw—return a shim.
  if (!url || !key || typeof window === "undefined") {
    return makeNoopClient();
  }
  return createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
})();
