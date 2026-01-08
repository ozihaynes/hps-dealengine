import { ReactNode } from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | HPS DealEngine',
  description: 'Manage your preferences and organization settings',
};

/**
 * Settings Root Layout
 *
 * Wraps all settings pages with consistent layout and metadata.
 */
export default function SettingsRootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Skip link for accessibility */}
      <a
        href="#settings-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[color:var(--accent-color)] focus:text-white focus:rounded-lg focus:outline-none"
      >
        Skip to settings content
      </a>
      {children}
    </>
  );
}
