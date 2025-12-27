
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function PingPage() {
  const [out, setOut] = useState<string>("");
  const [err, setErr] = useState<string>("");
  const [notice, setNotice] = useState<string>("");

  async function run() {
    setOut(""); setErr(""); setNotice("");
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        setNotice("Sign in to run ping.");
        return;
      }

      const { data, error } = await supabase.functions.invoke("v1-ping", {
        method: "GET",
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      });
      if (error) throw error;
      setOut(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setErr(e?.message ?? "Invoke failed");
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Edge Function: v1-ping</h1>
      <button onClick={run} className="rounded bg-black text-white px-3 py-1">Run Ping</button>
      {out && <pre className="border rounded p-3 bg-white/50 whitespace-pre-wrap">{out}</pre>}
      {notice && <p className="text-sm opacity-70">{notice}</p>}
      {err && <p className="text-red-600">{err}</p>}
      <p className="text-sm opacity-70">JWT is required for v1-ping.</p>
    </div>
  );
}


