import { createClient } from "@supabase/supabase-js";

export async function ping(accessToken: string) {
  if (!accessToken) {
    throw new Error("Missing access token for v1-ping");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } });
  const { data, error } = await supabase.functions.invoke("v1-ping", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (error) throw error;
  return data as { ok: boolean };
}
