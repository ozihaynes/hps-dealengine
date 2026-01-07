import { getSupabaseClient } from "@/lib/supabaseClient";
import type {
  TeamListResponse,
  TeamRemoveRequest,
  TeamRemoveResponse,
  TeamErrorResponse,
} from "@hps-internal/contracts";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Custom error class for team operations
 */
export class TeamError extends Error {
  constructor(
    message: string,
    public field?: string,
    public status?: number,
  ) {
    super(message);
    this.name = "TeamError";
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
    throw new TeamError("Not authenticated. Please sign in.", undefined, 401);
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

/**
 * List all team members for an organization
 */
export async function listMembers(orgId: string): Promise<TeamListResponse> {
  const headers = await getAuthHeaders();

  let response: Response;
  try {
    response = await fetch(
      `${SUPABASE_URL}/functions/v1/v1-team-list?org_id=${encodeURIComponent(orgId)}`,
      { method: "GET", headers },
    );
  } catch (networkError) {
    throw new TeamError(
      "Unable to connect. Please check your internet connection.",
      undefined,
      0,
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    const errorData = data as TeamErrorResponse;
    throw new TeamError(
      errorData.error || "Failed to load team",
      errorData.field,
      response.status,
    );
  }

  return data as TeamListResponse;
}

/**
 * Remove a member from an organization
 *
 * Edge cases handled:
 * - EC-2.7: Remove self -> 400 error
 * - EC-2.8: Remove VP -> 403 error (unless caller is VP)
 */
export async function removeMember(
  request: TeamRemoveRequest,
): Promise<TeamRemoveResponse> {
  const headers = await getAuthHeaders();

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/v1-team-remove`, {
      method: "DELETE",
      headers,
      body: JSON.stringify(request),
    });
  } catch (networkError) {
    throw new TeamError(
      "Unable to connect. Please check your internet connection.",
      undefined,
      0,
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    const errorData = data as TeamErrorResponse;
    throw new TeamError(
      errorData.error || "Failed to remove member",
      errorData.field,
      response.status,
    );
  }

  return data as TeamRemoveResponse;
}
