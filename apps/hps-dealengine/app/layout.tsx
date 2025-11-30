import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DealSessionProvider } from "@/lib/dealSessionContext";

export const metadata: Metadata = {
  title: "HPS DealEngine",
  description:
    "Deterministic underwriting OS for distressed SFR deals in Central Florida",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#020617] text-text-primary antialiased">
        <DealSessionProvider>
          {children}
        </DealSessionProvider>
      </body>
    </html>
  );
}
