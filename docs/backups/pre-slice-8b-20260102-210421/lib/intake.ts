"use client";

import type {
  SendIntakeLinkRequest,
  SendIntakeLinkResponse,
} from "@hps-internal/contracts";
import { getSupabaseClient } from "@/lib/supabaseClient";

export type SendIntakeLinkResult = SendIntakeLinkResponse;

/**
 * Send an intake form link to a client via the v1-intake-send-link Edge Function.
 *
 * @param input.dealId - UUID of the deal to attach intake to
 * @param input.recipientEmail - Client email address
 * @param input.recipientName - Optional client name for personalization
 * @param input.schemaVersionId - Optional specific schema version (defaults to org's active)
 * @param input.expiresInDays - Optional expiry (1-90 days, default 14)
 * @param input.customMessage - Optional custom message for the email
 * @returns The link ID, token (returned once), intake URL, and email status
 */
export async function sendIntakeLink(input: {
  dealId: string;
  recipientEmail: string;
  recipientName?: string;
  schemaVersionId?: string;
  expiresInDays?: number;
  customMessage?: string;
}): Promise<SendIntakeLinkResult> {
  const supabase = getSupabaseClient();

  const requestBody: SendIntakeLinkRequest = {
    deal_id: input.dealId,
    recipient_email: input.recipientEmail,
    recipient_name: input.recipientName,
    schema_version_id: input.schemaVersionId,
    expires_in_days: input.expiresInDays ?? 14,
    custom_message: input.customMessage,
  };

  const { data, error } = await supabase.functions.invoke(
    "v1-intake-send-link",
    {
      body: requestBody,
    },
  );

  if (error) {
    const message =
      (data as Record<string, unknown>)?.message ??
      (data as Record<string, unknown>)?.error ??
      error.message;
    throw new Error(String(message) ?? "Failed to send intake link.");
  }

  const response = data as Record<string, unknown>;

  // Check for API error response
  if (response.ok === false) {
    throw new Error(
      String(response.message ?? response.error ?? "Failed to send intake link"),
    );
  }

  const linkId = response.link_id as string | undefined;
  const token = response.token as string | undefined;
  const intakeUrl = response.intake_url as string | undefined;
  const expiresAt = response.expires_at as string | undefined;

  if (!linkId || !token || !intakeUrl || !expiresAt) {
    throw new Error("Intake link response is missing required fields.");
  }

  return {
    link_id: linkId,
    intake_url: intakeUrl,
    expires_at: expiresAt,
  };
}
