'use client';

import { useState, useEffect, useMemo } from 'react';
import { Settings } from 'lucide-react';
import { Postures, type UserSettings } from '@hps-internal/contracts';
import { SettingsCard } from './SettingsCard';
import { SaveStatus, SaveStatusType } from './SaveStatus';
import { ThemeSwitcher } from './ThemeSwitcher';
import { Button, SelectField } from '@/components/ui';
import { fetchUserSettings, upsertUserSettings } from '@/lib/userSettings';
import { useToast } from '@/hooks/useToast';
import type { ThemeSetting } from '@/components/theme/ThemeProvider';
import { DEFAULT_THEME, THEME_METADATA } from '@/lib/themeTokens';

type FormState = {
  defaultPosture: string;
  defaultMarket: string;
  theme: ThemeSetting;
};

const DEFAULTS: FormState = {
  defaultPosture: 'base',
  defaultMarket: 'ORL',
  theme: DEFAULT_THEME,
};

const ALLOWED_THEME_VALUES = new Set<ThemeSetting>(
  Object.keys(THEME_METADATA) as ThemeSetting[]
);
const THEME_ALIASES: Record<string, ThemeSetting> = {
  system: DEFAULT_THEME,
  white: DEFAULT_THEME,
  pink2: 'pink',
  pink3: 'pink',
};

const marketOptions = [{ value: 'ORL', label: 'Orlando (ORL)' }];

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function mapSettingsToForm(settings: UserSettings): FormState {
  const incomingTheme = settings.theme as ThemeSetting | undefined;
  const aliasTheme = incomingTheme
    ? THEME_ALIASES[incomingTheme] ?? incomingTheme
    : undefined;
  const normalizedTheme =
    aliasTheme && ALLOWED_THEME_VALUES.has(aliasTheme)
      ? aliasTheme
      : DEFAULTS.theme;
  return {
    defaultPosture: settings.defaultPosture ?? DEFAULTS.defaultPosture,
    defaultMarket: settings.defaultMarket ?? DEFAULTS.defaultMarket,
    theme: normalizedTheme,
  };
}

/**
 * PreferencesSection
 *
 * Manages user preferences: theme, default posture, and default market.
 */
export function PreferencesSection() {
  const { toast } = useToast();

  // Form state
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [initial, setInitial] = useState<FormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatusType>('idle');
  const [error, setError] = useState<string | null>(null);

  // Load settings from API
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const settings = await fetchUserSettings();
        const nextState: FormState = settings
          ? mapSettingsToForm(settings)
          : DEFAULTS;

        if (isMounted) {
          setForm(nextState);
          setInitial(nextState);
        }
      } catch (err) {
        console.error('[settings/user] failed to load settings', err);
        if (isMounted) {
          setError('Could not load settings. Please try again.');
          setForm(DEFAULTS);
          setInitial(DEFAULTS);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  // Track changes
  const hasChanges = useMemo(() => {
    if (!initial) return false;
    return (
      form.defaultPosture !== initial.defaultPosture ||
      form.defaultMarket !== initial.defaultMarket ||
      form.theme !== initial.theme
    );
  }, [form, initial]);

  // Save settings
  const onSave = async () => {
    if (!initial || !hasChanges) return;

    const payload: Record<string, unknown> = {};

    if (form.defaultPosture !== initial.defaultPosture) {
      payload.defaultPosture = form.defaultPosture;
    }
    if (form.defaultMarket !== initial.defaultMarket) {
      payload.defaultMarket = form.defaultMarket;
    }
    if (form.theme !== initial.theme) {
      payload.theme = form.theme;
    }

    setSaveStatus('saving');
    setError(null);

    try {
      const saved = await upsertUserSettings(payload);
      const next = mapSettingsToForm(saved);
      setForm(next);
      setInitial(next);
      setSaveStatus('success');
      toast.success('Settings saved', 'Your preferences have been updated.');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('[settings/user] failed to save settings', err);
      setSaveStatus('error');
      setError('Could not save settings. Try again.');
      toast.error('Save failed', 'Could not save settings. Try again.');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <SettingsCard
        title="Preferences"
        description="Theme, default posture, and market settings."
        icon={<Settings className="h-5 w-5" />}
        data-testid="settings-card-preferences"
      >
        <div className="space-y-4 animate-pulse">
          <div className="h-20 bg-white/5 rounded-lg" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-[68px] bg-white/5 rounded-lg" />
            <div className="h-[68px] bg-white/5 rounded-lg" />
          </div>
        </div>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard
      title="Preferences"
      description="Theme, default posture, and market settings."
      icon={<Settings className="h-5 w-5" />}
      data-testid="settings-card-preferences"
      footer={
        <div className="flex items-center gap-3">
          {error && <span className="text-sm text-accent-orange">{error}</span>}
          <SaveStatus status={saveStatus} />
          <Button
            onClick={onSave}
            disabled={saveStatus === 'saving' || !hasChanges}
            variant="primary"
          >
            {saveStatus === 'saving' ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Theme Selection */}
        <div className="space-y-3">
          <ThemeSwitcher
            onSelect={(value) => {
              setForm((prev) => ({ ...prev, theme: value }));
            }}
          />
        </div>

        {/* Underwriting Defaults */}
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Default posture"
            value={form.defaultPosture}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                defaultPosture: e.target.value,
              }))
            }
            description="Choose which posture to start from when underwriting."
          >
            {Postures.map((posture) => (
              <option key={posture} value={posture}>
                {capitalize(posture)}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Default market"
            value={form.defaultMarket}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                defaultMarket: e.target.value,
              }))
            }
            description="Market used for repair rates and defaults."
          >
            {marketOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </SelectField>
        </div>
      </div>
    </SettingsCard>
  );
}
