"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";
import type { AiBridgeResult, AiTone } from "./ai/types";

const FUNCTION_NAME = "v1-ai-bridge";

async function invokeAiBridge(payload: unknown): Promise<AiBridgeResult> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body: payload });

  if (error) {
    throw new Error(error.message || "AI bridge call failed");
  }

  if ((data as any)?.result) {
    return (data as any).result as AiBridgeResult;
  }

  return data as AiBridgeResult;
}

export async function askDealAnalyst(params: {
  dealId: string;
  runId: string;
  posture?: string;
  userPrompt: string;
  tone?: AiTone;
  isStale?: boolean;
}): Promise<AiBridgeResult> {
  if (!params.dealId || !params.runId) {
    throw new Error("dealId and runId are required for deal analyst.");
  }
  return invokeAiBridge({
    persona: "dealAnalyst",
    dealId: params.dealId,
    runId: params.runId,
    posture: params.posture,
    userPrompt: params.userPrompt,
    tone: params.tone ?? "neutral",
    isStale: params.isStale ?? false,
  });
}

export async function askDealStrategist(params: {
  userPrompt: string;
  posture?: string;
  sandboxSettings?: unknown;
  route?: string;
  tone?: AiTone;
}): Promise<AiBridgeResult> {
  return invokeAiBridge({
    persona: "dealStrategist",
    userPrompt: params.userPrompt,
    posture: params.posture,
    sandboxSettings: params.sandboxSettings,
    route: params.route,
    tone: params.tone ?? "neutral",
  });
}

/** @deprecated legacy wrapper; prefer askDealAnalyst/askDealStrategist */
export async function fetchStrategistAnalysis(params: {
  dealId: string;
  runId: string;
  posture?: string;
  prompt: string;
}) {
  return askDealAnalyst({
    dealId: params.dealId,
    runId: params.runId,
    posture: params.posture,
    userPrompt: params.prompt,
  });
}
