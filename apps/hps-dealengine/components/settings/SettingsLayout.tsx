'use client';

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SettingsNav } from './SettingsNav';

/**
 * Motion configuration using design tokens
 * Duration: 200ms standard, 300ms emphasis
 * Easing: ease-out for exits, spring for entrances
 */
const MOTION_CONFIG = {
  page: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1], // ease-out-expo
    },
  },
  header: {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1],
    },
  },
} as const;

interface SettingsLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

/**
 * SettingsLayout
 *
 * Wraps settings tab pages with navigation and consistent styling.
 * Uses Framer Motion for smooth page transitions with reduced motion support.
 */
export function SettingsLayout({
  children,
  title,
  description,
}: SettingsLayoutProps): JSX.Element {
  return (
    <div className="space-y-6" data-testid="settings-page">
      {/* Page Header */}
      <motion.header
        {...MOTION_CONFIG.header}
        className="space-y-1 motion-safe:animate-in"
      >
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-text-secondary">
          Manage your preferences and organization settings
        </p>
      </motion.header>

      {/* Tab Navigation */}
      <SettingsNav />

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.main
          key={title}
          {...MOTION_CONFIG.page}
          className="space-y-6 motion-safe:animate-in"
          id="settings-content"
          role="tabpanel"
          aria-label={`${title} settings`}
        >
          {/* Section Header */}
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
            {description && (
              <p className="text-sm text-text-secondary">{description}</p>
            )}
          </div>

          {/* Content */}
          {children}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
