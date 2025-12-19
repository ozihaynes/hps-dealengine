// apps/hps-dealengine/app/settings/policy/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { clearAiWindowsStorage } from "@/lib/ai/aiWindowsContext";
import { GlassCard } from "@/components/ui";

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
      {/* Preserve mobile + tablet layout exactly */}
      <div className="lg:hidden">
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
      </div>

      {/* Desktop-wide layout */}
      <div className="hidden lg:block">
        <div className="mx-auto max-w-[96rem]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
                Policy settings
              </h1>
              {userEmail && (
                <p className="mt-1 text-sm text-text-secondary">
                  Signed in as <span className="font-mono">{userEmail}</span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg,strong)]/70 px-4 py-2 text-sm font-semibold text-text-primary shadow-sm backdrop-blur transition hover:bg-[color:var(--glass-bg,strong)] focus:outline-none focus:ring-2 focus:ring-accent-blue/60"
            >
              Sign out
            </button>
          </div>

          <div className="grid grid-cols-12 gap-6">
            <aside className="col-span-4">
              <GlassCard className="p-5 space-y-3 lg:self-start">
                <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
                  Workspace
                </p>
                <h2 className="text-lg font-semibold text-text-primary">
                  Underwriting policy
                </h2>
                <p className="text-sm text-text-secondary">
                  This slice will host policy corridor editing, rails, and audit
                  wiring. Desktop uses a two-pane editor layout so the schema,
                  help, and save actions stay visible while you tune tokens.
                </p>
              </GlassCard>
            </aside>

            <section className="col-span-8">
              <GlassCard className="p-5 space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-text-primary">
                    Policy editor (coming soon)
                  </h2>
                  <p className="text-sm text-text-secondary">
                    For now, the key check is: you can only see this page when
                    you are signed in.
                  </p>
                </div>

                <div className="rounded-xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg,strong)]/80 p-4 text-sm text-text-secondary backdrop-blur">
                  Next: wire policy tokens with governance + versions, then ship
                  a two-column editor (fields on left, live trace + rationale on
                  right).
                </div>
              </GlassCard>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
