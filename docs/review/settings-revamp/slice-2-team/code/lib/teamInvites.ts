import { getSupabaseClient } from "@/lib/supabaseClient";
import type {
  InviteSendRequest,
  InviteSendResponse,
  InviteAcceptRequest,
  InviteAcceptResponse,
  InviteListResponse,
  InviteRevokeRequest,
  InviteRevokeResponse,
  InviteErrorResponse,
} from "@hps-internal/contracts";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Custom error class for invite operations
 */
export class InviteError extends Error {
  constructor(
    message: string,
    public field?: string,
    public status?: number,
    public expectedEmail?: string,
    public existingExpiresAt?: string,
  ) {
    super(message);
    this.name = "InviteError";
  }
}

/**
 * Get auth headers for API calls
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new InviteError(
      "Not authenticated. Please sign in.",
      undefined,
      401,
    );
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

/**
 * Send a team invitation
 *
 * Edge cases handled:
 * - EC-2.2: Duplicate invite → 409 error with existing_expires_at
 * - EC-2.9: Non-manager → 403 error
 * - EC-2.10: Email fails → Returns with email_sent=false
 */
export async function sendInvite(
  request: InviteSendRequest,
): Promise<InviteSendResponse> {
  const headers = await getAuthHeaders();

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/v1-invite-send`, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    });
  } catch (networkError) {
    throw new InviteError(
      "Unable to connect. Please check your internet connection.",
      undefined,
      0,
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    const errorData = data as InviteErrorResponse;
    throw new InviteError(
      errorData.error || "Failed to send invitation",
      errorData.field,
      response.status,
      errorData.expected_email,
      errorData.existing_expires_at,
    );
  }

  return data as InviteSendResponse;
}

/**
 * Accept an invitation
 *
 * Edge cases handled:
 * - EC-2.3: Expired token → 410 error
 * - EC-2.4: Email mismatch → 403 error with expected_email
 * - EC-2.5: Already used → 400 error
 */
export async function acceptInvite(
  request: InviteAcceptRequest,
): Promise<InviteAcceptResponse> {
  const headers = await getAuthHeaders();

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/v1-invite-accept`, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    });
  } catch (networkError) {
    throw new InviteError(
      "Unable to connect. Please check your internet connection.",
      undefined,
      0,
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    const errorData = data as InviteErrorResponse;
    throw new InviteError(
      errorData.message || errorData.error || "Failed to accept invitation",
      errorData.field,
      response.status,
      errorData.expected_email,
    );
  }

  return data as InviteAcceptResponse;
}

/**
 * List pending invitations for an organization
 */
export async function listInvites(orgId: string): Promise<InviteListResponse> {
  const headers = await getAuthHeaders();

  let response: Response;
  try {
    response = await fetch(
      `${SUPABASE_URL}/functions/v1/v1-invite-list?org_id=${encodeURIComponent(orgId)}`,
      { method: "GET", headers },
    );
  } catch (networkError) {
    throw new InviteError(
      "Unable to connect. Please check your internet connection.",
      undefined,
      0,
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    const errorData = data as InviteErrorResponse;
    throw new InviteError(
      errorData.error || "Failed to list invitations",
      undefined,
      response.status,
    );
  }

  return data as InviteListResponse;
}

/**
 * Revoke a pending invitation
 *
 * Edge cases handled:
 * - EC-2.6: Already accepted → 400 error
 */
export async function revokeInvite(
  request: InviteRevokeRequest,
): Promise<InviteRevokeResponse> {
  const headers = await getAuthHeaders();

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/v1-invite-revoke`, {
      method: "DELETE",
      headers,
      body: JSON.stringify(request),
    });
  } catch (networkError) {
    throw new InviteError(
      "Unable to connect. Please check your internet connection.",
      undefined,
      0,
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    const errorData = data as InviteErrorResponse;
    throw new InviteError(
      errorData.error || "Failed to revoke invitation",
      undefined,
      response.status,
    );
  }

  return data as InviteRevokeResponse;
}
