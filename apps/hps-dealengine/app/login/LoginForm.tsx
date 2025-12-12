"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "../../lib/supabaseClient";
import styles from "./login.module.css";

type LoginFormProps = {
  redirectTo?: string;
};

export default function LoginForm({
  redirectTo = "/settings/policy",
}: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("owner@hps.test.local");
  const [password, setPassword] = useState("HpsDev!2025");
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
    <div className="w-full max-w-[460px] text-white">
      <form
        onSubmit={onSubmit}
        className={`${styles.loginCard} relative w-full space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl sm:p-10`}
      >
        <div className="space-y-2 text-center">
          <div className={`${styles.logoIcon} mx-auto`}>
            <Image
              src="/real_DealEngine_Mascot.png"
              alt="DealEngine mascot"
              width={1024}
              height={1024}
              className="h-24 w-24 object-cover"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back
          </h1>
          <p className="text-sm text-white/70">
            Sign in to continue underwriting
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-white/90"
              htmlFor="email"
            >
              Email address
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-white/50">
                ✉
              </span>
              <input
                id="email"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 pl-11 text-[15px] text-white placeholder:text-white/60 transition focus:border-[rgba(0,150,255,0.6)] focus:ring-2 focus:ring-[rgba(0,150,255,0.3)] focus:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-white/90"
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-white/50">
                🔒
              </span>
              <input
                id="password"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 pl-11 text-[15px] text-white placeholder:text-white/60 transition focus:border-[rgba(0,150,255,0.6)] focus:ring-2 focus:ring-[rgba(0,150,255,0.3)] focus:outline-none"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end text-sm">
          <a
            className="font-medium text-[var(--accent-blue,#0096ff)] transition hover:opacity-80"
            href="mailto:support@hpsdealengine.com"
          >
            Forgot password?
          </a>
        </div>

        <button
          disabled={busy}
          className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[var(--accent-blue,#0096ff)] to-[#00d4ff] px-4 py-3.5 text-base font-semibold text-white shadow-[0_12px_32px_rgba(0,150,255,0.35)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(0,150,255,0.35)] disabled:translate-y-0 disabled:opacity-70"
        >
          <span className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 transition duration-700 ease-out group-hover:translate-x-[120%] group-hover:opacity-100" />
          <span className="relative z-10">
            {busy ? "Signing in..." : "Sign In"}
          </span>
        </button>

        {msg && (
          <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {msg}
          </div>
        )}

        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/50">
          <span className="h-px flex-1 bg-white/15" />
          <span className="whitespace-nowrap">or continue with</span>
          <span className="h-px flex-1 bg-white/15" />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm font-semibold">
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/80 transition hover:border-[rgba(0,150,255,0.35)] hover:text-white"
          >
            <span className="text-lg">G</span>
            <span>Google</span>
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/80 transition hover:border-[rgba(0,150,255,0.35)] hover:text-white"
          >
            <span className="text-lg">A</span>
            <span>Apple</span>
          </button>
        </div>

        <p className="text-center text-sm text-white/60">
          Need access? Contact your org admin to be added.
        </p>
      </form>
    </div>
  );
}
