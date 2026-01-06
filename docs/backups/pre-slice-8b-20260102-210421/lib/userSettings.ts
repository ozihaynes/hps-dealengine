"use client";

import type {
  UserSettings,
  UserSettingsGetInput,
  UserSettingsUpsertInput,
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

/**
 * GET current user settings for the caller (scoped by org via memberships).
 */
export async function fetchUserSettings(
  input: UserSettingsGetInput = {},
): Promise<UserSettings | null> {
  const supabaseUrl = assertEnv();
  const token = await getAccessToken();
  const qs = input.orgId ? `?orgId=${encodeURIComponent(input.orgId)}` : "";

  const res = await fetch(
    `${supabaseUrl}/functions/v1/v1-user-settings${qs}`,
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
      `Failed to fetch user settings (status ${res.status})${
        text ? `: ${text}` : ""
      }`,
    );
  }

  const json = (await res.json()) as
    | { ok: true; settings: UserSettings | null }
    | { ok: false; error?: string };

  if (!json || !("ok" in json) || !json.ok) {
    throw new Error((json as any)?.error ?? "Failed to fetch user settings");
  }

  return (json as { ok: true; settings: UserSettings | null }).settings ?? null;
}

/**
 * PUT upsert user settings for the caller (scoped by org via memberships).
 */
export async function upsertUserSettings(
  input: UserSettingsUpsertInput,
): Promise<UserSettings> {
  const supabaseUrl = assertEnv();
  const token = await getAccessToken();

  const res = await fetch(`${supabaseUrl}/functions/v1/v1-user-settings`, {
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
      `Failed to save user settings (status ${res.status})${
        text ? `: ${text}` : ""
      }`,
    );
  }

  const json = (await res.json()) as
    | { ok: true; settings: UserSettings }
    | { ok: false; error?: string };

  if (!json || !("ok" in json) || !json.ok || !json.settings) {
    throw new Error((json as any)?.error ?? "Failed to save user settings");
  }

  return json.settings;
}
