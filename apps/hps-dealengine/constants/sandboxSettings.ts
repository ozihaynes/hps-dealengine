import { Postures } from "@hps-internal/contracts";
import type {
  SandboxConfig,
  SandboxSettingMeta,
} from "@hps-internal/contracts";
import {
  SANDBOX_DEFAULTS as CONTRACT_SANDBOX_DEFAULTS,
  SANDBOX_ROOT_DEFAULTS,
  SANDBOX_SETTING_META,
} from "@hps-internal/contracts";
import {
  SANDBOX_ALL_SETTING_DEFS,
  SANDBOX_PAGES_CONFIG as RAW_SANDBOX_PAGES_CONFIG,
  createInitialSandboxState,
  type SandboxSettingDef,
} from "./sandboxSettingsSource";

export type SandboxSettingItem = SandboxSettingDef;

export type SandboxPage = {
  title: string;
  icon?: string;
  description: string;
  settings: SandboxSettingItem[];
};

export const SANDBOX_PAGES_CONFIG: SandboxPage[] = RAW_SANDBOX_PAGES_CONFIG;

export const DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
  ...(CONTRACT_SANDBOX_DEFAULTS as Record<string, any>),
  ...SANDBOX_ROOT_DEFAULTS,
};

// Posture-aware keys (vary by posture)
export const POSTURE_AWARE_KEYS: string[] = [
  "arvRange",
  "repairBudgetRange",
  "discountRange",
  "flags",
  "aivSafetyCapPercentage",
  "buyerTargetMarginFlipBaselinePolicy",
  "minSpreadByArvBand",
  "initialOfferSpreadMultiplier",
  "carryMonthsMaximumCap",
  "floorInvestorAivDiscountTypicalZip",
  "floorPayoffMoveOutCashDefault",
];

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/** Build a complete settings object with defaults for every key */
export function buildDefaultSandboxSettings(): SandboxConfig {
  return { ...DEFAULT_SANDBOX_CONFIG };
}

/** Merge fetched config with defaults to guarantee required keys exist */
export function mergeSandboxConfig(config?: Record<string, any>): SandboxConfig {
  const base = { ...DEFAULT_SANDBOX_CONFIG, ...(config ?? {}) } as SandboxConfig;
  const existingPostureConfigs = (config as any)?.postureConfigs ?? {};

  const postureConfigs: Record<(typeof Postures)[number], Record<string, any>> =
    {} as Record<(typeof Postures)[number], Record<string, any>>;

  for (const posture of Postures) {
    postureConfigs[posture] = { ...(existingPostureConfigs?.[posture] ?? {}) };
    for (const key of POSTURE_AWARE_KEYS) {
      const fallback =
        existingPostureConfigs?.[posture]?.[key] ??
        (config as any)?.[key] ??
        (DEFAULT_SANDBOX_CONFIG as any)[key];
      if (fallback !== undefined) {
        postureConfigs[posture][key] = clone(fallback);
      }
    }
  }

  // Keep root posture-aware fields aligned with base posture for compatibility
  for (const key of POSTURE_AWARE_KEYS) {
    (base as any)[key] =
      postureConfigs.base?.[key] ??
      (base as any)[key] ??
      (DEFAULT_SANDBOX_CONFIG as any)[key];
  }

  return {
    ...base,
    postureConfigs,
  };
}

export function prepareSandboxConfigForSave(config: SandboxConfig): SandboxConfig {
  const next = { ...config };
  // ensure root posture-aware fields mirror base posture for compatibility
  const baseOverrides = (config.postureConfigs as any)?.base ?? {};
  for (const key of POSTURE_AWARE_KEYS) {
    if (baseOverrides[key] !== undefined) {
      (next as any)[key] = clone(baseOverrides[key]);
    }
  }
  return next;
}

export function isPostureAwareKey(key: string) {
  return POSTURE_AWARE_KEYS.includes(key);
}

export const ALL_SANDBOX_SETTING_DEFS = SANDBOX_ALL_SETTING_DEFS;
export const ALL_SANDBOX_SETTING_META: SandboxSettingMeta[] = SANDBOX_SETTING_META;
export const SANDBOX_SETTING_META_BY_KEY: Record<string, SandboxSettingMeta> =
  Object.fromEntries(SANDBOX_SETTING_META.map((m) => [m.key, m]));
