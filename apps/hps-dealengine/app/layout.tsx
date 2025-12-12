import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DealSessionProvider } from "@/lib/dealSessionContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export const dynamic = "force-dynamic";

// We changed 'export const metadata' to a function so Sentry can inject data dynamically
export function generateMetadata(): Metadata {
  return {
    title: "HPS DealEngine",
    description:
      "Deterministic underwriting OS for distressed SFR/townhomes in Central Florida. Production-ready v1 with runs, evidence, and governance.",
  };
}

const THEME_BOOT_SCRIPT = `
(function() {
  try {
    var KEY = 'dealengine.theme';
    var allowed = ['system','dark','light','navy','burgundy','green','black','white'];
    var setting = 'system';
    try {
      var stored = localStorage.getItem(KEY);
      if (stored && allowed.indexOf(stored) !== -1) {
        setting = stored;
      }
    } catch (e) {
      // ignore storage errors
    }
    var prefersDark = false;
    try {
      prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (_) {}
    var resolve = function(val) {
      if (val === 'system') return prefersDark ? 'navy' : 'white';
      if (val === 'dark') return 'navy';
      if (val === 'light') return 'white';
      return val;
    };
    var resolved = resolve(setting);
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.setAttribute('data-theme-setting', setting);
  } catch (e) {
    // silent failure; defaults remain
  }
})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="navy">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_BOOT_SCRIPT,
          }}
        />
      </head>
      <body className="min-h-screen bg-[color:var(--bg-primary)] text-[color:var(--text-primary)] antialiased">
        <ThemeProvider>
          <DealSessionProvider>
            {children}
          </DealSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
