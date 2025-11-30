"use client";

import type {
  SandboxConfig,
  SandboxStrategistRequest,
  SandboxStrategistResponse,
} from "@hps-internal/contracts";
import { getSupabaseClient } from "@/lib/supabaseClient";

export async function askSandboxStrategist(
  input: SandboxStrategistRequest,
): Promise<SandboxStrategistResponse> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke(
    "v1-sandbox-strategist",
    { body: input },
  );

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("No response from sandbox strategist");
  }

  return data as SandboxStrategistResponse;
}

export function buildStrategistPayload(
  prompt: string,
  posture: SandboxStrategistRequest["posture"],
  settings: SandboxConfig,
): SandboxStrategistRequest {
  return {
    prompt,
    posture,
    settings,
  };
}
