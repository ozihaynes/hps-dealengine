import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, DM_Sans, JetBrains_Mono } from "next/font/google";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { DealSessionProvider } from "@/lib/dealSessionContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export const dynamic = "force-dynamic";

// ═══════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY - Command Center V2.1 Design System
// ═══════════════════════════════════════════════════════════════════════════

const displayFont = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const bodyFont = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

// ═══════════════════════════════════════════════════════════════════════════
// METADATA
// ═══════════════════════════════════════════════════════════════════════════

export function generateMetadata(): Metadata {
  return {
    title: "HPS DealEngine",
    description:
      "Deterministic underwriting OS for distressed SFR/townhomes in Central Florida. Production-ready v1 with runs, evidence, and governance.",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THEME INITIALIZATION
// Applies theme before first paint to prevent flash
// ═══════════════════════════════════════════════════════════════════════════

const THEME_BOOT_SCRIPT = `
(function() {
  try {
    var KEY = 'dealengine.theme';
    var allowed = ['burgundy','green','navy','violet','pink','black','pink2','pink3','system','dark','light','white'];
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
    document.documentElement.setAttribute('data-theme-setting-raw', setting);
  } catch (e) {
    // silent failure; defaults remain
  }
})();`;

// ═══════════════════════════════════════════════════════════════════════════
// ROOT LAYOUT
// ═══════════════════════════════════════════════════════════════════════════

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme="navy"
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_BOOT_SCRIPT,
          }}
        />
      </head>
      <body className="min-h-screen bg-[color:var(--bg-primary)] text-[color:var(--text-primary)] antialiased font-body">
        <QueryProvider>
          <ThemeProvider>
            <DealSessionProvider>
              {children}
            </DealSessionProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
