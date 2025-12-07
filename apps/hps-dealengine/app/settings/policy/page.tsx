// apps/hps-dealengine/app/settings/policy/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { clearAiWindowsStorage } from "@/lib/ai/aiWindowsContext";

export default function PolicySettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (error || !data.user) {
          // No session → bounce to login with redirectTo
          router.replace(
            `/login?redirectTo=${encodeURIComponent("/settings/policy")}`,
          );
          return;
        }

        setUserEmail(data.user.email ?? null);
        setLoading(false);
      } catch {
        if (!isMounted) return;
        router.replace(
          `/login?redirectTo=${encodeURIComponent("/settings/policy")}`,
        );
      }
    }

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleSignOut() {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setUserEmail(null);
      clearAiWindowsStorage();
      router.replace("/login");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-slate-400">Checking your session…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Policy settings</h1>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800"
        >
          Sign out
        </button>
      </div>

      {userEmail && (
        <p className="text-sm text-slate-400 mb-6">
          Signed in as <span className="font-mono">{userEmail}</span>
        </p>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <p className="text-sm text-slate-200">
          Policy settings UI will live here. For now, the key check is: you can
          only see this page when you are signed in.
        </p>
      </section>
    </main>
  );
}
