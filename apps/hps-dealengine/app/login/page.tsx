"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const rtr = useRouter();
  const [email, setEmail] = useState("policy@example.com");
  const [password, setPassword] = useState("Password123!");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);

    // Try sign-in first
    const signIn = await supabase.auth.signInWithPassword({ email, password });

    if (signIn.error) {
      const m = signIn.error.message?.toLowerCase() || "";
      // If user doesn't exist locally, auto-create then sign-in
      if (m.includes("invalid login") || m.includes("email not confirmed") || m.includes("user not found")) {
        const signUp = await supabase.auth.signUp({ email, password });
        if (signUp.error) {
          setBusy(false); setMsg(signUp.error.message); return;
        }
        // Some setups don't return a session on signUp in dev; sign-in again
        const retry = await supabase.auth.signInWithPassword({ email, password });
        if (retry.error) { setBusy(false); setMsg(retry.error.message); return; }
        setBusy(false); rtr.push("/settings/policy"); return;
      }
      setBusy(false); setMsg(signIn.error.message); return;
    }

    setBusy(false);
    rtr.push("/settings/policy");
  }

  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl p-6 shadow">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <input className="w-full border rounded px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" />
        <input className="w-full border rounded px-3 py-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="password" />
        <button disabled={busy} className="w-full rounded bg-black text-white py-2">{busy ? "…" : "Sign in"}</button>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </form>
    </div>
  );
}
