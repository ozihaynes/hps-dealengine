"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Browser client uses NEXT_PUBLIC_* (public) URL+ANON; the SDK sends the user's access token.
// RLS stays enforced inside your Edge Function.
const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Page() {
  const [prompt, setPrompt] = useState("");
  const [resp, setResp] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function askGemini() {
    setLoading(true); setErr(null); setResp(null);
    const { data, error } = await supa.functions.invoke("v1-ai-bridge", {
      body: { prompt }
    });
    if (error) setErr(error.message); else setResp(data);
    setLoading(false);
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 space-y-4">
      <h1 className="text-xl font-semibold">AI Bridge Debug</h1>
      <input
        className="w-full rounded border px-3 py-2"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ask the AI bridge…"
      />
      <button
        onClick={askGemini}
        disabled={loading || !prompt.trim()}
        className="rounded px-4 py-2 border"
      >
        {loading ? "Thinking…" : "Ask"}
      </button>
      {err && <pre className="text-red-600 whitespace-pre-wrap">Error: {err}</pre>}
      {resp && <pre className="whitespace-pre-wrap">{JSON.stringify(resp, null, 2)}</pre>}
    </div>
  );
}
