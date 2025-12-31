"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GlassCard, Button, Icon } from "@/components/ui";
import { Icons } from "@/constants";
import { getRequestIdFromCookie } from "@/lib/o11y/requestId";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [requestId, setRequestId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  useEffect(() => {
    setRequestId(getRequestIdFromCookie());
  }, []);

  const handleCopy = async () => {
    if (!requestId) return;
    try {
      await navigator.clipboard.writeText(requestId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#020617] flex items-center justify-center px-4">
        <GlassCard className="max-w-lg w-full p-8 border border-white/10 bg-surface-elevated/60 text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-accent-orange-subtle flex items-center justify-center border border-accent-orange/40">
              <Icon d={Icons.alert} size={24} className="text-accent-orange" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Something went wrong
          </h1>
          <p className="text-sm text-text-secondary">
            We hit an unexpected error. Try again, or head back to your dashboard.
          </p>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left">
            <div className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Support ID
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-mono text-text-primary break-all">
                {requestId ?? "unavailable"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                disabled={!requestId}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="primary" onClick={reset}>
              Try again
            </Button>
            <Link href="/startup">
              <Button variant="neutral">Back to Dashboard</Button>
            </Link>
          </div>
        </GlassCard>
      </body>
    </html>
  );
}
