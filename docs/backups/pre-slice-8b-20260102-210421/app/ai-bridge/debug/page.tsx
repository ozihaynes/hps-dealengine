"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Dev-only debug console for v1-ai-bridge. Requires explicit persona selection.
const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function Page() {
  const [prompt, setPrompt] = useState("");
  const [persona, setPersona] = useState<"dealAnalyst" | "dealStrategist">("dealStrategist");
  const [dealId, setDealId] = useState("");
  const [runId, setRunId] = useState("");
  const [resp, setResp] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function callBridge() {
    setLoading(true);
    setErr(null);
    setResp(null);
    const body =
      persona === "dealAnalyst"
        ? { persona, dealId, runId, posture: "base", userPrompt: prompt, prompt }
        : { persona, userPrompt: prompt, posture: "base", route: "/ai-bridge/debug" };

    const { data, error } = await supa.functions.invoke("v1-ai-bridge", { body });
    if (error) setErr(error.message);
    else setResp(data);
    setLoading(false);
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 space-y-4">
      <h1 className="text-xl font-semibold">AI Bridge Debug (dev-only)</h1>
      <div className="flex flex-col gap-2">
        <label className="text-sm text-text-secondary">
          Persona
          <select
            className="ml-2 rounded border px-2 py-1"
            value={persona}
            onChange={(e) => setPersona(e.target.value as any)}
          >
            <option value="dealAnalyst">dealAnalyst</option>
            <option value="dealStrategist">dealStrategist</option>
          </select>
        </label>
        {persona === "dealAnalyst" && (
          <div className="flex gap-2">
            <input
              className="flex-1 rounded border px-2 py-1"
              placeholder="dealId"
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
            />
            <input
              className="flex-1 rounded border px-2 py-1"
              placeholder="runId"
              value={runId}
              onChange={(e) => setRunId(e.target.value)}
            />
          </div>
        )}
        <textarea
          className="w-full rounded border px-3 py-2"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask the AI bridge."
          rows={3}
        />
      </div>
      <button
        onClick={callBridge}
        disabled={loading || !prompt.trim() || (persona === "dealAnalyst" && (!dealId || !runId))}
        className="rounded px-4 py-2 border"
      >
        {loading ? "Thinking." : "Ask"}
      </button>
      {err && <pre className="text-red-600 whitespace-pre-wrap">Error: {err}</pre>}
      {resp && <pre className="whitespace-pre-wrap">{JSON.stringify(resp, null, 2)}</pre>}
    </div>
  );
}
