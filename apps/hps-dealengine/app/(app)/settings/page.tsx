"use client";

import type { ReactNode } from "react";

export default function SettingsHubPage(): ReactNode {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-text-primary">
          Settings
        </h1>
        <p className="text-sm text-text-secondary">
          Configure your DealEngine&trade; workspace, policies, and preferences.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Sandbox settings card */}
        <a
          href="/settings/sandbox"
          className="group rounded-xl border border-white/5 bg-surface-elevated/60 p-4 hover:border-accent-blue/60 hover:bg-surface-elevated transition-colors"
        >
          <h2 className="text-sm font-medium text-text-primary group-hover:text-accent-blue">
            Sandbox Settings
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            Configure default ranges and toggles for sandbox scenarios.
          </p>
        </a>

        <a
          href="/settings/policy-overrides"
          className="group rounded-xl border border-white/5 bg-surface-elevated/60 p-4 hover:border-accent-blue/60 hover:bg-surface-elevated transition-colors"
        >
          <h2 className="text-sm font-medium text-text-primary group-hover:text-accent-blue">
            Policy Overrides
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            Review and approve override requests for policy fields.
          </p>
        </a>

        {/* User preferences card */}
        <a
          href="/settings/user"
          className="group rounded-xl border border-white/5 bg-surface-elevated/60 p-4 hover:border-accent-blue/60 hover:bg-surface-elevated transition-colors"
        >
          <h2 className="text-sm font-medium text-text-primary group-hover:text-accent-blue">
            User Settings
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            Set your default posture, market, and theme.
          </p>
        </a>

        {/* Policy editor card */}
        <a
          href="/settings/policy"
          className="group rounded-xl border border-white/5 bg-surface-elevated/60 p-4 hover:border-accent-blue/60 hover:bg-surface-elevated transition-colors"
        >
          <h2 className="text-sm font-medium text-text-primary group-hover:text-accent-blue">
            Underwriting Policy
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            Tune your corridor ranges, fees, and decision rails.
          </p>
        </a>

        {/* Policy versions card */}
        <a
          href="/settings/policy-versions"
          className="group rounded-xl border border-white/5 bg-surface-elevated/60 p-4 hover:border-accent-blue/60 hover:bg-surface-elevated transition-colors"
        >
          <h2 className="text-sm font-medium text-text-primary group-hover:text-accent-blue">
            Policy Versions &amp; History
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            Review past policy versions and audit underwriting changes.
          </p>
        </a>
      </div>
    </div>
  );
}
