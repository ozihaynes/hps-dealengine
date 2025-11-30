"use client";

import type {
  SandboxSettings,
  SandboxSettingsGetInput,
  SandboxSettingsUpsertInput,
} from "@hps-internal/contracts";
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

export async function fetchSandboxSettings(
  input: SandboxSettingsGetInput = {},
): Promise<SandboxSettings | null> {
  const supabaseUrl = assertEnv();
  const token = await getAccessToken();
  const qs = new URLSearchParams();
  if (input.orgId) qs.set("orgId", input.orgId);
  if (input.posture) qs.set("posture", input.posture);

  const res = await fetch(
    `${supabaseUrl}/functions/v1/v1-sandbox-settings${qs.toString() ? `?${qs.toString()}` : ""}`,
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
      `Failed to fetch sandbox settings (status ${res.status})${text ? `: ${text}` : ""}`,
    );
  }

  const json = (await res.json()) as
    | { ok: true; settings: SandboxSettings | null }
    | { ok: false; error?: string };

  if (!json || !("ok" in json) || !json.ok) {
    throw new Error((json as any)?.error ?? "Failed to fetch sandbox settings");
  }

  return (json as { ok: true; settings: SandboxSettings | null }).settings ?? null;
}

export async function upsertSandboxSettings(
  input: SandboxSettingsUpsertInput,
): Promise<SandboxSettings> {
  const supabaseUrl = assertEnv();
  const token = await getAccessToken();

  const res = await fetch(`${supabaseUrl}/functions/v1/v1-sandbox-settings`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to save sandbox settings (status ${res.status})${text ? `: ${text}` : ""}`,
    );
  }

  const json = (await res.json()) as
    | { ok: true; settings: SandboxSettings }
    | { ok: false; error?: string };

  if (!json || !("ok" in json) || !json.ok || !json.settings) {
    throw new Error((json as any)?.error ?? "Failed to save sandbox settings");
  }

  return json.settings;
}
