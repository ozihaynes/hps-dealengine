'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { SETTINGS_TABS, getSettingsTabByPath } from '@/lib/constants/settings-config';
import { cn } from '@/components/ui';

/**
 * SettingsNav
 *
 * Horizontal tab navigation for Settings pages.
 * Uses Framer Motion layoutId for smooth tab indicator animation.
 */
export function SettingsNav() {
  const pathname = usePathname();
  const activeTab = getSettingsTabByPath(pathname)?.id ?? 'user';

  return (
    <nav
      className="relative flex gap-1 rounded-xl border border-white/5 bg-surface-elevated/50 p-1 backdrop-blur-sm"
      role="tablist"
      aria-label="Settings navigation"
    >
      {SETTINGS_TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.id}
            href={tab.href}
            role="tab"
            aria-selected={isActive}
            aria-controls={`${tab.id}-panel`}
            tabIndex={isActive ? 0 : -1}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated',
              'min-h-[44px]', // WCAG touch target
              isActive
                ? 'text-text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
            )}
          >
            {/* Active Tab Background (animated) */}
            {isActive && (
              <motion.div
                layoutId="settings-tab-indicator"
                className="absolute inset-0 rounded-lg bg-white/10 border border-white/10"
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 35,
                }}
                aria-hidden="true"
              />
            )}

            {/* Tab Content */}
            <span className="relative z-10 flex items-center gap-2">
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{tab.label}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
