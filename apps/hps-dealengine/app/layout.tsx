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
    var allowed = ['burgundy','green','navy','pink','black','pink2','pink3','system','dark','light','white'];
    var setting = 'navy';
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
    var normalize = function(val) {
      if (val === 'pink2' || val === 'pink3') return 'pink';
      if (val === 'white' || val === 'system' || val === 'dark' || val === 'light') return 'navy';
      return val;
    };
    var resolve = function(val) {
      if (val === 'system' || val === 'dark' || val === 'light') return 'navy';
      return val;
    };
    var normalizedSetting = normalize(setting);
    var resolved = resolve(normalizedSetting);
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.setAttribute('data-theme-setting', normalizedSetting);
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
