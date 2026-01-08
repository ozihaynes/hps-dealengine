import { getSupabaseClient } from "@/lib/supabaseClient";
import type {
  ProfileGetResponse,
  ProfilePutResponse,
  ProfileUpdate,
  ProfileErrorResponse,
} from "@hps-internal/contracts";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PROFILE_GET_URL = `${SUPABASE_URL}/functions/v1/v1-profile-get`;
const PROFILE_PUT_URL = `${SUPABASE_URL}/functions/v1/v1-profile-put`;

/**
 * Custom error class for profile operations
 */
export class ProfileError extends Error {
  constructor(
    message: string,
    public field?: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ProfileError";
  }
}

/**
 * Fetches the current user's profile
 *
 * Edge cases handled:
 * - Not authenticated: Throws with clear message
 * - Network failure (EC-1.6): Throws with retry suggestion
 * - Profile doesn't exist (EC-1.1): Returns skeleton with is_new=true
 */
export async function fetchProfile(): Promise<ProfileGetResponse> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new ProfileError(
      "Not authenticated. Please sign in again.",
      undefined,
      401,
    );
  }

  let response: Response;
  try {
    response = await fetch(PROFILE_GET_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    });
  } catch (networkError) {
    throw new ProfileError(
      "Unable to connect. Please check your internet connection and try again.",
      undefined,
      0,
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    const errorData = data as ProfileErrorResponse;
    throw new ProfileError(
      errorData.error || `Failed to fetch profile (${response.status})`,
      errorData.field,
      response.status,
    );
  }

  return data as ProfileGetResponse;
}

/**
 * Updates the current user's profile
 *
 * Edge cases handled:
 * - Validation errors: Returns field-specific error
 * - Not authenticated: Throws with redirect suggestion
 * - Network failure (EC-1.6): Throws with retry suggestion
 */
export async function updateProfile(
  updates: ProfileUpdate,
): Promise<ProfilePutResponse> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new ProfileError(
      "Session expired. Please sign in again.",
      undefined,
      401,
    );
  }

  let response: Response;
  try {
    response = await fetch(PROFILE_PUT_URL, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });
  } catch (networkError) {
    throw new ProfileError(
      "Unable to save changes. Please check your connection and try again.",
      undefined,
      0,
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    const errorData = data as ProfileErrorResponse;
    throw new ProfileError(
      errorData.error || `Failed to update profile (${response.status})`,
      errorData.field,
      response.status,
    );
  }

  return data as ProfilePutResponse;
}

/**
 * Saves form state to localStorage for recovery (EC-1.7)
 */
export function saveProfileDraft(draft: Partial<ProfileUpdate>): void {
  try {
    localStorage.setItem("profile_draft", JSON.stringify(draft));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Retrieves saved form state from localStorage
 */
export function getProfileDraft(): Partial<ProfileUpdate> | null {
  try {
    const draft = localStorage.getItem("profile_draft");
    return draft ? JSON.parse(draft) : null;
  } catch {
    return null;
  }
}

/**
 * Clears saved form state
 */
export function clearProfileDraft(): void {
  try {
    localStorage.removeItem("profile_draft");
  } catch {
    // Ignore
  }
}
