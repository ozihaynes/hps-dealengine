"use client";

export const dynamic = "force-dynamic";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import OverviewTab from "@/components/overview/OverviewTab";
import { Button } from "@/components/ui";

import { createInitialEstimatorState } from "@ui-v2/constants";
import type { Deal } from "@ui-v2/types";

import {
  HPSEngine,
  DoubleClose,
  type DoubleCloseCalcs,
} from "../../../services/engine";
import { fmt$ } from "../../../utils/helpers";
import { useDealSession } from "@/lib/dealSessionContext";
import StrategistPanel from "@/components/underwrite/StrategistPanel";

/**
 * Ensure the Deal has the shape OverviewTab + engine expect.
 * This tolerates partial shapes coming from UI-V2 or engine defaults.
 */
function normalizeDealShape(base?: any): Deal {
  const d: any = base ? structuredClone(base) : {};

  d.market = {
    arv: 0,
    as_is_value: 0,
    price_to_list_ratio: 0,
    local_discount_pct: 0,
    dom: 0,
    months_of_inventory: 0,
    ...(d.market ?? {}),
  };

  d.costs = {
    ...(d.costs ?? {}),
    double_close: d.costs?.double_close ?? {},
  };

  d.debt = {
    senior_principal: 0,
    ...(d.debt ?? {}),
  };

  return d as Deal;
}

/**
 * Build a robust initial Deal that matches what OverviewTab expects.
 * Prefer UI-V2 estimator defaults; fall back to HPSEngine defaults,
 * then to a minimal defensive shape.
 */
function makeInitialDeal(): Deal {
  // 1) Try UI-V2 estimator state (design source of truth)
  try {
    const est: any =
      typeof createInitialEstimatorState === "function"
        ? createInitialEstimatorState()
        : {};

    if (est?.deal) return normalizeDealShape(est.deal);
    if (est?.state?.deal) return normalizeDealShape(est.state.deal);
    if (est?.estimator?.deal) return normalizeDealShape(est.estimator.deal);
  } catch {
    // swallow and fall through to engine defaults
  }

  // 2) Try engine helpers / defaults
  try {
    const engineAny: any = HPSEngine as any;
    if (typeof engineAny?.createInitialDeal === "function") {
      return normalizeDealShape(engineAny.createInitialDeal());
    }
    if (engineAny?.defaults?.deal) {
      return normalizeDealShape(engineAny.defaults.deal);
    }
  } catch {
    // fall through to final minimal shape
  }

  // 3) Final defensive fallback: just the fields OverviewTab/engine touch
  return normalizeDealShape({
    market: {
      arv: 0,
      as_is_value: 0,
      price_to_list_ratio: 0,
      local_discount_pct: 0,
      dom: 0,
      months_of_inventory: 0,
    },
    costs: {
      double_close: {},
    },
    debt: {
      senior_principal: 0,
    },
  });
}

export default function Page() {
  // Shared state coming from DealSession (same session as /underwrite)
  const { deal: rawDeal, sandbox, lastAnalyzeResult, dbDeal } = useDealSession();
  const [posture] = useState<"conservative" | "base" | "aggressive">("base");

  // Always normalize the shape so OverviewTab + engine get what they expect
  const deal = useMemo(
    () => normalizeDealShape(rawDeal ?? makeInitialDeal()),
    [rawDeal],
  );

  const [playbookContent, setPlaybookContent] = useState<string>("");
  const [analysisRun, setAnalysisRun] = useState(false);

  // Local engine calculations (deterministic stub)
  const engineResult: any = useMemo(
    () => HPSEngine.runEngine({ deal }, sandbox),
    [deal, sandbox],
  );
  const calc: any = engineResult?.calculations ?? {};

  // Double-close math (Florida-specific) – tolerate missing costs on deal
  const dcInput = ((deal as any).costs?.double_close ?? {}) as any;
  const dcAutofilled = DoubleClose.autofill(dcInput, { deal }, calc);
  const dcResult = DoubleClose.computeDoubleClose(dcAutofilled, {
    deal,
  }) as DoubleCloseCalcs;

  // "Has input" based on local deal, plus any DealSession-backed engine result
  const hasUserInput =
    Number((deal as any).market?.arv ?? 0) > 0 ||
    Number((deal as any).market?.as_is_value ?? 0) > 0 ||
    Number((deal as any).debt?.senior_principal ?? 0) > 0;

  const canAnalyze = hasUserInput || !!lastAnalyzeResult;

  const generatePlaybook = useCallback(() => {
    if (!canAnalyze) return;

    const buyerCeiling = Number(calc.buyerCeiling ?? 0);
    const respectFloor = Number(calc.respectFloorPrice ?? 0);
    const wholesaleFee =
      isFinite(buyerCeiling) && isFinite(respectFloor)
        ? buyerCeiling - respectFloor
        : 0;

    const urgencyDays = Number(calc.urgencyDays ?? 0);
    const dcLoad =
      Number((dcResult as any).Extra_Closing_Load ?? 0) +
      Number((dcResult as any).Total_Double_Close_Cost ?? 0);

    const parts: string[] = [];

    parts.push(
      `<p><strong>Deal snapshot:</strong> Buyer ceiling ${fmt$(
        buyerCeiling,
        0,
      )}, Respect Floor ${fmt$(
        respectFloor,
        0,
      )}, implied spread ${fmt$(
        wholesaleFee,
        0,
      )} before double-close friction.</p>`,
    );

    if (dcLoad > 0) {
      parts.push(
        `<p><strong>Double-close load:</strong> Approx ${fmt$(
          dcLoad,
          0,
        )} in additional closing friction to account for. This reduces true spread to about ${fmt$(
          wholesaleFee - dcLoad,
          0,
        )}.</p>`,
      );
    }

    if (urgencyDays > 0) {
      parts.push(
        `<p><strong>Urgency:</strong> This deal has roughly ${urgencyDays.toFixed(
          0,
        )} days of runway before risk steps up. Present it as “we’re in a ${urgencyDays.toFixed(
          0,
        )}-day window before we have to re-underwrite and the number can move,” not as pressure.</p>`,
      );
    }

    parts.push(
      "<p><strong>Next steps:</strong> 1) Confirm payoffs and arrears. 2) Validate repair scope and timeline. 3) Align exit strategy with capital stack and local DOM.</p>",
    );

    setPlaybookContent(parts.join(""));
    setAnalysisRun(true);
  }, [canAnalyze, calc, dcResult]);

  // Auto-generate the playbook the first time we have a usable analysis
  useEffect(() => {
    if (!lastAnalyzeResult) return;
    if (!canAnalyze) return;
    if (playbookContent) return;

    generatePlaybook();
  }, [lastAnalyzeResult, canAnalyze, playbookContent, generatePlaybook]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
            Overview
          </h1>
          <p className="text-sm text-text-secondary">
            One-glance snapshot of where this deal sits in the corridor.
          </p>
        </div>

        <Button
          variant="primary"
          disabled={!canAnalyze}
          onClick={generatePlaybook}
        >
          Generate Playbook
        </Button>
      </div>

      <div>
        <OverviewTab
          deal={deal}
          calc={calc}
          flags={{}}
          hasUserInput={canAnalyze}
          playbookContent={playbookContent}
          isAnalyzing={false}
          analysisRun={analysisRun}
        />
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          Strategist (AI)
        </h2>
        <StrategistPanel
          dealId={dbDeal?.id}
          runId={undefined}
          posture={posture}
          runOutput={null}
          runTrace={null}
          policySnapshot={null}
          evidenceSummary={[]}
        />
      </div>
    </div>
  );
}
