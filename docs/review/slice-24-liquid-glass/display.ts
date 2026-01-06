/**
 * Display Utilities for HPS DealEngine V2.5
 *
 * Safe formatting functions for displaying values in the UI.
 * All functions handle null/undefined/NaN gracefully.
 */

import type { VerdictType } from '@/lib/types/dashboard';

/**
 * Format currency with K/M suffixes
 *
 * @example
 * formatCurrency(18500) // "$18.5K"
 * formatCurrency(2500000) // "$2.50M"
 * formatCurrency(null) // "—"
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000) {
    return `${sign}$${(absValue / 1_000_000).toFixed(2)}M`;
  }
  if (absValue >= 1_000) {
    return `${sign}$${(absValue / 1_000).toFixed(1)}K`;
  }
  return `${sign}$${absValue.toLocaleString()}`;
}

/**
 * Format currency without abbreviation (full number with commas)
 *
 * @example
 * formatCurrencyFull(18500) // "$18,500"
 * formatCurrencyFull(null) // "—"
 */
export function formatCurrencyFull(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage
 *
 * @example
 * formatPercent(14.8) // "14.8%"
 * formatPercent(null) // "—"
 */
export function formatPercent(
  value: number | null | undefined,
  decimals: number = 1
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format number with commas
 *
 * @example
 * formatNumber(12345) // "12,345"
 * formatNumber(null) // "—"
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return value.toLocaleString();
}

/**
 * Safe display value with fallback
 *
 * @example
 * safeDisplayValue(undefined, 'N/A') // "N/A"
 * safeDisplayValue('Hello') // "Hello"
 * safeDisplayValue(0) // 0
 */
export function safeDisplayValue<T>(
  value: T | null | undefined,
  fallback: string = '—'
): T | string {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return fallback;
  }
  return value;
}

/**
 * Verdict display configuration
 */
export interface VerdictConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  bgClass: string;
  textClass: string;
  glowClass: string;
  icon: string;
}

/**
 * Get verdict display config
 *
 * @example
 * const config = getVerdictConfig('PURSUE');
 * // { label: 'Pursue', color: 'text-emerald-400', ... }
 */
export function getVerdictConfig(verdict: VerdictType): VerdictConfig {
  const configs: Record<VerdictType, VerdictConfig> = {
    PURSUE: {
      label: 'Pursue',
      description: 'Deal meets criteria - ready for offer',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500',
      borderColor: 'border-emerald-500/40',
      bgClass: 'bg-emerald-500/20',
      textClass: 'text-emerald-400',
      glowClass: 'shadow-[0_0_30px_rgba(16,185,129,0.3)]',
      icon: '✓',
    },
    NEEDS_EVIDENCE: {
      label: 'Needs Evidence',
      description: 'Additional data required for decision',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500',
      borderColor: 'border-amber-500/40',
      bgClass: 'bg-amber-500/20',
      textClass: 'text-amber-400',
      glowClass: 'shadow-[0_0_30px_rgba(245,158,11,0.3)]',
      icon: '?',
    },
    PASS: {
      label: 'Pass',
      description: 'Deal does not meet criteria',
      color: 'text-red-400',
      bgColor: 'bg-red-500',
      borderColor: 'border-red-500/40',
      bgClass: 'bg-red-500/20',
      textClass: 'text-red-400',
      glowClass: 'shadow-[0_0_20px_rgba(239,68,68,0.2)]',
      icon: '✗',
    },
  };

  return configs[verdict];
}

/**
 * Get velocity band display config
 */
export function getVelocityConfig(band: string): {
  label: string;
  color: string;
  emoji: string;
} {
  const configs: Record<string, { label: string; color: string; emoji: string }> =
    {
      hot: { label: 'Hot', color: 'text-red-400', emoji: '🔥' },
      warm: { label: 'Warm', color: 'text-orange-400', emoji: '☀️' },
      balanced: { label: 'Balanced', color: 'text-yellow-400', emoji: '⚖️' },
      cool: { label: 'Cool', color: 'text-blue-400', emoji: '❄️' },
      cold: { label: 'Cold', color: 'text-slate-400', emoji: '🧊' },
    };

  return configs[band] ?? { label: band, color: 'text-slate-400', emoji: '—' };
}

/**
 * Format relative time (e.g., "2 days ago")
 *
 * @example
 * formatRelativeTime(new Date(Date.now() - 3600000)) // "1 hour ago"
 */
export function formatRelativeTime(date: Date | string | null): string {
  if (!date) return '—';

  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
