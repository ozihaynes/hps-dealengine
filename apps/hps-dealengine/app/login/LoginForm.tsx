"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "../../lib/supabaseClient";

type LoginFormProps = {
  redirectTo?: string;
};

export default function LoginForm({
  redirectTo = "/settings/policy",
}: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("qa-policy-test@yourdomain.com");
  const [password, setPassword] = useState("Password123!");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // If ?redirectTo=/something is in the URL, obey it
  const effectiveRedirect =
    searchParams.get("redirectTo") ?? redirectTo ?? "/settings/policy";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);

    const supabase = getSupabaseClient();

    // 1) Try sign-in
    const signIn = await supabase.auth.signInWithPassword({ email, password });

    if (signIn.error) {
      const m = signIn.error.message?.toLowerCase() ?? "";

      // 2) If user not found / invalid, auto sign-up then sign-in
      if (
        m.includes("invalid login") ||
        m.includes("email not confirmed") ||
        m.includes("user not found")
      ) {
        const signUp = await supabase.auth.signUp({ email, password });
        if (signUp.error) {
          setBusy(false);
          setMsg(signUp.error.message);
          return;
        }

        const retry = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (retry.error) {
          setBusy(false);
          setMsg(retry.error.message);
          return;
        }

        setBusy(false);
        router.push(effectiveRedirect);
        return;
      }

      // Other auth errors
      setBusy(false);
      setMsg(signIn.error.message);
      return;
    }

    // 3) Success path
    setBusy(false);
    router.push(effectiveRedirect);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm space-y-4 rounded-2xl p-6 shadow bg-black/70 border border-white/10"
    >
      <h1 className="text-xl font-semibold text-white">Sign in</h1>

      <input
        className="w-full border rounded px-3 py-2 bg-black text-white border-white/25"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email"
        autoComplete="email"
      />

      <input
        className="w-full border rounded px-3 py-2 bg-black text-white border-white/25"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="password"
        autoComplete="current-password"
      />

      <button
        disabled={busy}
        className="w-full rounded bg-white text-black py-2 font-medium disabled:opacity-60"
      >
        {busy ? "…" : "Sign in"}
      </button>

      {msg && <p className="text-sm text-red-400">{msg}</p>}
    </form>
  );
}
