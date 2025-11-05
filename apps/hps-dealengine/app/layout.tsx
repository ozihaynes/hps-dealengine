import "./globals.css";
import React from "react";
import AppTopNav from "../components/AppTopNav";

export const metadata = {
  title: "HPS DealEngine",
  description: "Deterministic underwriting sandbox",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0B1220] text-slate-200 antialiased">
        <AppTopNav />
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}