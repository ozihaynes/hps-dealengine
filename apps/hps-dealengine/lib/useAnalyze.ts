"use client";
import { useEffect, useState } from "react";
import type { AnalyzeResult } from "@hps-internal/contracts";
import { subscribeAnalyzeResult, getLastAnalyzeResult } from "@/lib/analyzeBus";

export function useAnalyze() {
  const [result, setResult] = useState<AnalyzeResult | null>(getLastAnalyzeResult());
  useEffect(() => {
    const unsub = subscribeAnalyzeResult(setResult as any);
    return () => unsub();
  }, []);
  return result;
}
