import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Toaster } from "sonner";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return {
    title: "Client Intake Form | HPS DealEngine",
    description: "Complete your property information form.",
    robots: "noindex, nofollow", // Prevent indexing of token-gated pages
  };
}

/**
 * Minimal public layout for intake forms.
 * No authentication required, minimal chrome for client focus.
 */
export default function IntakeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Minimal header */}
      <header className="border-b border-slate-700/40 bg-slate-800/30 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20">
                <svg
                  className="h-5 w-5 text-sky-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <span className="text-lg font-semibold text-white">
                Property Intake Form
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      {/* Minimal footer */}
      <footer className="border-t border-slate-700/40 py-4">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <p className="text-center text-xs text-slate-500">
            Powered by HPS DealEngine
          </p>
        </div>
      </footer>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          style: {
            background: "#1e293b",
            border: "1px solid #334155",
            color: "#f1f5f9",
          },
        }}
      />
    </div>
  );
}
