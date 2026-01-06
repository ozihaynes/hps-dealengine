"use client";

import type { SandboxConfig, SandboxPreset } from "@hps-internal/contracts";
import { getSupabaseClient } from "@/lib/supabaseClient";

function assertEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  return url;
}

async function getAccessToken(): Promise<string> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("No Supabase session; please sign in.");
  }
  return token;
}

export async function fetchSandboxPresets(params: {
  posture?: SandboxPreset["posture"];
} = {}): Promise<SandboxPreset[]> {
  const supabaseUrl = assertEnv();
  const token = await getAccessToken();
  const qs = new URLSearchParams();
  if (params.posture) qs.set("posture", params.posture);

  const res = await fetch(
    `${supabaseUrl}/functions/v1/v1-sandbox-presets${qs.toString() ? `?${qs.toString()}` : ""}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to fetch sandbox presets (status ${res.status})${text ? `: ${text}` : ""}`,
    );
  }

  const json = (await res.json()) as
    | { ok: true; presets: SandboxPreset[] }
    | { ok: false; error?: string };

  if (!json || !("ok" in json) || !json.ok) {
    throw new Error((json as any)?.error ?? "Failed to fetch sandbox presets");
  }

  return json.presets;
}

export async function createSandboxPreset(input: {
  name: string;
  posture?: SandboxPreset["posture"];
  settings: SandboxConfig;
}): Promise<SandboxPreset> {
  const supabaseUrl = assertEnv();
  const token = await getAccessToken();

  const res = await fetch(`${supabaseUrl}/functions/v1/v1-sandbox-presets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to save sandbox preset (status ${res.status})${text ? `: ${text}` : ""}`,
    );
  }

  const json = (await res.json()) as
    | { ok: true; preset: SandboxPreset }
    | { ok: false; error?: string };

  if (!json || !("ok" in json) || !json.ok || !json.preset) {
    throw new Error((json as any)?.error ?? "Failed to save sandbox preset");
  }

  return json.preset;
}

export async function deleteSandboxPreset(id: SandboxPreset["id"]): Promise<void> {
  const supabaseUrl = assertEnv();
  const token = await getAccessToken();

  const res = await fetch(`${supabaseUrl}/functions/v1/v1-sandbox-presets`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to delete sandbox preset (status ${res.status})${text ? `: ${text}` : ""}`,
    );
  }
}
