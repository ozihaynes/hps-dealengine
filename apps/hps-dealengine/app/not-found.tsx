"use client";

import Link from "next/link";
import { GlassCard, Button, Icon } from "@/components/ui";
import { Icons } from "@/constants";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center px-4">
      <GlassCard className="max-w-lg w-full p-8 border border-white/10 bg-surface-elevated/60 text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-accent-blue/10 flex items-center justify-center border border-accent-blue/30">
            <Icon d={Icons.alert} size={24} className="text-accent-blue" />
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-text-primary">
          Page not found
        </h1>
        <p className="text-sm text-text-secondary">
          The resource you’re looking for doesn’t exist or may have moved.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link href="/startup">
            <Button variant="primary">Go to Dashboard</Button>
          </Link>
          <Link href="/deals">
            <Button variant="neutral">View Deals</Button>
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
