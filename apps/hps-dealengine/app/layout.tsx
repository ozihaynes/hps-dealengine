import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DealSessionProvider } from "@/lib/dealSessionContext";

export const dynamic = "force-dynamic";

// We changed 'export const metadata' to a function so Sentry can inject data dynamically
export function generateMetadata(): Metadata {
  return {
    title: "HPS DealEngine",
    description:
      "Deterministic underwriting OS for distressed SFR/townhomes in Central Florida. Production-ready v1 with runs, evidence, and governance.",
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="navy">
      <body className="min-h-screen bg-[color:var(--bg-primary)] text-[color:var(--text-primary)] antialiased">
        <DealSessionProvider>
          {children}
        </DealSessionProvider>
      </body>
    </html>
  );
}
