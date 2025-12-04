"use client";

import Link from "next/link";
import { GlassCard, Button, Icon } from "@/components/ui";
import { Icons } from "@/constants";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ reset }: GlobalErrorProps) {
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
