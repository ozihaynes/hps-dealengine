"use client";

import { useEffect } from "react";
import type { Deal, EngineCalculations } from "@/types";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  deal: Deal;
  sandbox?: any;
  onResult?: (o: { calculations: Partial<EngineCalculations> }) => void;
};

export default function AnalyzeNowListener({ deal, sandbox, onResult }: Props) {
  useEffect(() => {
    const handler = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("v1-analyze", {
          body: { deal }
        });
        if (error) {
          console.warn("v1-analyze error:", error);
        } else if (data) {
          onResult?.(data as any);
        }
      } catch (e) {
        console.warn("v1-analyze failed:", e);
      }
    };

    window.addEventListener("hps:analyze-now" as any, handler);
    return () => window.removeEventListener("hps:analyze-now" as any, handler);
  }, [deal, sandbox, onResult]);

  return null;
}