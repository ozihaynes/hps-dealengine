"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function PolicyDebug() {
  const [out, setOut] = useState("");
  const [err, setErr] = useState("");
  const [posture, setPosture] = useState<"conservative"|"base"|"aggressive">("base");

  async function run() {
    setOut(""); setErr("");
    const { data, error } = await supabase.functions.invoke("v1-policy", {
      method: "POST",
      body: { posture }
    });
    if (error) { setErr(error.message); return; }
    setOut(JSON.stringify(data, null, 2));
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Edge Function: v1-policy:get</h1>
      <div className="flex items-center gap-2">
        <label className="opacity-70">Posture</label>
        <select
          value={posture}
          onChange={e => setPosture(e.target.value as any)}
          className="rounded border px-2 py-1 bg-white/80 text-black"
        >
          <option value="conservative">conservative</option>
          <option value="base">base</option>
          <option value="aggressive">aggressive</option>
        </select>
        <button onClick={run} className="rounded bg-black text-white px-3 py-1">Run GET</button>
      </div>
      {out && <pre className="border rounded p-3 bg-white/50 whitespace-pre-wrap">{out}</pre>}
      {err && <p className="text-red-600">{err}</p>}
      <p className="text-sm opacity-70">JWT must be present; log out → should 401 by gateway.</p>
    </div>
  );
}
