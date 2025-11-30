import { createClient } from "@supabase/supabase-js";

export type AiReply = { text?: string; output?: string };

export async function askGemini(prompt: string): Promise<AiReply> {
  // Caller-scoped client; relies on user session. Safe: uses ANON key.
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data, error } = await supa.functions.invoke("v1-ai-bridge", { body: { prompt } });
  if (error) { throw new Error(error.message ?? "AI bridge error"); }
  return data as AiReply;
}
