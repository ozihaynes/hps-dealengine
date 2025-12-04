import type { RepairRates, SandboxConfig } from "@hps-internal/contracts";
import { Postures } from "@hps-internal/contracts";

import { POSTURE_AWARE_KEYS } from "@/constants/sandboxSettings";
import type { Deal } from "@/types";
import { sandboxToAnalyzeOptions } from "./sandboxToAnalyzeOptions";

export type SandboxPolicyOptions = {
  posture: (typeof Postures)[number];
  caps: {
    aivSafetyCapPct?: number;
    arvSoftMaxVsAivMultiplier?: number;
  };
  spreads: {
    minSpreadByArvBand?: any[];
    initialOfferSpreadMultiplier?: number;
    minSpreadDefaultPct?: number;
  };
  carry: {
    carryMonthsCap?: number;
  };
  margins: {
    buyerTargetMarginFlipBaselinePolicy?: number;
  };
  timeline: {
    urgentMaxDtm?: number;
    offerValidityDays?: number;
  };
  disposition: {
    doubleCloseMinSpreadThreshold?: number;
  };
};

export type AnalyzeRequestPayload = {
  org_id?: string;
  posture: (typeof Postures)[number];
  deal: {
    dealId?: string;
    arv?: number | null;
    aiv?: number | null;
    dom_zip_days?: number | null;
    moi_zip_months?: number | null;
    price_to_list_pct?: number | null;
    local_discount_pct?: number | null;
    options?: { trace?: boolean };
  };
  sandboxPolicy: SandboxPolicyOptions;
  sandboxOptions?: ReturnType<typeof sandboxToAnalyzeOptions>;
  sandboxSnapshot: SandboxConfig;
  repairProfile?: RepairRates;
};

const toNumberOrNull = (value: unknown): number | null => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
};

const toNumber = (value: unknown): number | undefined => {
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  return num;
};

const pickPostureValue = (
  sandbox: SandboxConfig,
  posture: (typeof Postures)[number],
  key: string,
) => {
  const postureConfigs = (sandbox as any)?.postureConfigs ?? {};
  const postureValue = postureConfigs?.[posture]?.[key];
  if (typeof postureValue !== "undefined") return postureValue;
  return (sandbox as any)?.[key];
};

export function buildSandboxPolicyOptions(
  sandbox: SandboxConfig,
  posture: (typeof Postures)[number],
): SandboxPolicyOptions {
  const minSpreadBands = (sandbox as any)?.minSpreadByArvBand;
  const defaultMinSpreadPct = toNumber(
    (Array.isArray(minSpreadBands) ? minSpreadBands[0]?.minSpreadPct : null) ??
      (sandbox as any)?.minSpreadPct ??
      (sandbox as any)?.minSpreadDefaultPct,
  );

  return {
    posture,
    caps: {
      aivSafetyCapPct: toNumber(
        pickPostureValue(sandbox, posture, "aivSafetyCapPercentage"),
      ),
      arvSoftMaxVsAivMultiplier: toNumber(
        (sandbox as any)?.arvSoftMaxVsAivMultiplier,
      ),
    },
    spreads: {
      minSpreadByArvBand: Array.isArray(minSpreadBands)
        ? minSpreadBands
        : undefined,
      initialOfferSpreadMultiplier: toNumber(
        pickPostureValue(sandbox, posture, "initialOfferSpreadMultiplier"),
      ),
      minSpreadDefaultPct: defaultMinSpreadPct,
    },
    carry: {
      carryMonthsCap: toNumber(
        pickPostureValue(sandbox, posture, "carryMonthsMaximumCap"),
      ),
    },
    margins: {
      buyerTargetMarginFlipBaselinePolicy: toNumber(
        pickPostureValue(sandbox, posture, "buyerTargetMarginFlipBaselinePolicy"),
      ),
    },
    timeline: {
      urgentMaxDtm: toNumber(
        pickPostureValue(
          sandbox,
          posture,
          "dispositionRecommendationUrgentCashMaxDtm",
        ),
      ),
      offerValidityDays: toNumber(
        pickPostureValue(sandbox, posture, "offerValidityPeriodDaysPolicy"),
      ),
    },
    disposition: {
      doubleCloseMinSpreadThreshold: toNumber(
        (sandbox as any)?.doubleCloseMinSpreadThreshold,
      ),
    },
  };
}

export function buildAnalyzeRequestPayload(params: {
  orgId?: string;
  posture: (typeof Postures)[number];
  dbDealId?: string;
  deal: Deal;
  sandbox: SandboxConfig;
  repairRates?: RepairRates | null;
}): AnalyzeRequestPayload {
  const { orgId, posture, dbDealId, deal, sandbox, repairRates } = params;
  const market: any = (deal as any)?.market ?? {};

  return {
    org_id: orgId,
    posture,
    deal: {
      dealId: dbDealId,
      arv: toNumberOrNull(market.arv ?? market.arv_value),
      aiv: toNumberOrNull(market.as_is_value ?? market.aiv),
      dom_zip_days: toNumberOrNull(
        market.dom_zip ?? market.dom_zip_days ?? market.dom,
      ),
      moi_zip_months: toNumberOrNull(
        market.moi_zip ??
          market.moi_zip_months ??
          market.months_of_inventory ??
          market.months_of_inventory_zip,
      ),
      price_to_list_pct: toNumberOrNull(
        market["price-to-list-pct"] ??
          market.price_to_list_pct ??
          market.price_to_list_ratio,
      ),
      local_discount_pct: toNumberOrNull(
        market.local_discount_20th_pct ?? market.local_discount_pct,
      ),
      options: { trace: true },
    },
    sandboxPolicy: buildSandboxPolicyOptions(sandbox, posture),
    sandboxOptions: sandboxToAnalyzeOptions({ sandbox, posture }),
    sandboxSnapshot: sandbox,
    repairProfile: repairRates ?? undefined,
  };
}

export function mergePostureAwareValues(
  sandbox: SandboxConfig,
  posture: (typeof Postures)[number],
): SandboxConfig {
  const next = { ...(sandbox ?? {}) } as any;
  for (const key of POSTURE_AWARE_KEYS) {
    const val = pickPostureValue(sandbox, posture, key);
    if (typeof val !== "undefined") {
      next[key] = val;
    }
  }
  return next;
}
