
"use client";

import { useEffect, useMemo } from "react";
import type { SandboxConfig } from "@hps-internal/contracts";
import { Postures } from "@hps-internal/contracts";
import type { Deal, EngineCalculations } from "@/types";
import { analyze } from "@/lib/edge";
import {
  buildAnalyzeRequestPayload,
  mergePostureAwareValues,
} from "@/lib/sandboxPolicy";

type Props = {
  deal: Deal;
  sandbox?: SandboxConfig;
  posture?: (typeof Postures)[number];
  orgId?: string;
  dbDealId?: string;
  onResult?: (o: { calculations: Partial<EngineCalculations> }) => void;
};

export default function AnalyzeNowListener({
  deal,
  sandbox,
  posture = "base",
  orgId,
  dbDealId,
  onResult,
}: Props) {
  const effectiveSandbox = useMemo(
    () => mergePostureAwareValues(sandbox ?? ({} as SandboxConfig), posture),
    [sandbox, posture],
  );

  useEffect(() => {
    const handler = async () => {
      try {
        const payload = buildAnalyzeRequestPayload({
          orgId,
          posture,
          dbDealId,
          deal,
          sandbox: effectiveSandbox,
        });
        const data = await analyze(payload);
        onResult?.(data as any);
      } catch (e) {
        console.warn("v1-analyze failed:", e);
      }
    };

    window.addEventListener("hps:analyze-now" as any, handler);
    return () => window.removeEventListener("hps:analyze-now" as any, handler);
  }, [deal, effectiveSandbox, posture, orgId, dbDealId, onResult]);

  return null;
}

