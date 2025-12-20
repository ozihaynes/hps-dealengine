"use client";

import { GlassCard } from "@/components/ui";

export default function SourcesPage() {
  return (
    <>
      {/* Preserve mobile + tablet layout exactly */}
      <div className="p-6 space-y-2 lg:hidden">
        <h1 className="text-xl font-semibold">Sources</h1>
        <p className="opacity-80">
          Data sources &amp; evidence configuration will live here.
        </p>
      </div>

      {/* Desktop-wide layout */}
      <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6">
        <GlassCard className="lg:col-span-4 p-4 md:p-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
            Settings
          </p>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
            Sources
          </h1>
          <p className="text-sm text-text-secondary">
            Connect your data + evidence inputs. Desktop layout uses a two-pane
            workspace to keep the primary configuration visible.
          </p>
        </GlassCard>

        <GlassCard className="lg:col-span-8 p-4 md:p-5 space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-text-primary">
              Evidence &amp; data connectors
            </h2>
            <p className="text-sm text-text-secondary">
              Data sources &amp; evidence configuration will live here.
            </p>
          </div>

          <div className="rounded-xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg,strong)]/80 p-4 text-sm text-text-secondary backdrop-blur">
            Coming soon: MLS/comp feeds, title/insurance integrations, and
            evidence upload defaults.
          </div>
        </GlassCard>
      </div>
    </>
  );
}
