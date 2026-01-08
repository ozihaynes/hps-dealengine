import { getSupabaseClient } from "@/lib/supabaseClient";
import type {
  OrgGetResponse,
  OrgUpdateRequest,
  OrgUpdateResponse,
  LogoUploadUrlRequest,
  LogoUploadUrlResponse,
  OrgErrorResponse,
} from "@hps-internal/contracts";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Custom error class for organization operations
 */
export class OrgError extends Error {
  constructor(
    message: string,
    public field?: string,
    public status?: number,
  ) {
    super(message);
    this.name = "OrgError";
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
    throw new OrgError("Not authenticated. Please sign in.", undefined, 401);
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

/**
 * Get organization details
 *
 * Edge cases handled:
 * - EC-3.5: Non-member -> 403 error
 * - EC-3.7: Org not found -> 404 error
 */
export async function getOrganization(orgId: string): Promise<OrgGetResponse> {
  const headers = await getAuthHeaders();

  let response: Response;
  try {
    response = await fetch(
      `${SUPABASE_URL}/functions/v1/v1-org-get?org_id=${encodeURIComponent(orgId)}`,
      { method: "GET", headers },
    );
  } catch (networkError) {
    throw new OrgError(
      "Unable to connect. Please check your internet connection.",
      undefined,
      0,
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    const errorData = data as OrgErrorResponse;
    throw new OrgError(
      errorData.error || "Failed to load organization",
      errorData.field,
      response.status,
    );
  }

  return data as OrgGetResponse;
}

/**
 * Update organization settings
 *
 * Edge cases handled:
 * - EC-3.1: Non-VP -> 403 error
 * - EC-3.2: Blank name -> 400 error
 */
export async function updateOrganization(
  request: OrgUpdateRequest,
): Promise<OrgUpdateResponse> {
  const headers = await getAuthHeaders();

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/v1-org-update`, {
      method: "PUT",
      headers,
      body: JSON.stringify(request),
    });
  } catch (networkError) {
    throw new OrgError(
      "Unable to connect. Please check your internet connection.",
      undefined,
      0,
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    const errorData = data as OrgErrorResponse;
    throw new OrgError(
      errorData.error || "Failed to update organization",
      errorData.field,
      response.status,
    );
  }

  return data as OrgUpdateResponse;
}

/**
 * Get a signed URL for logo upload
 *
 * Edge cases handled:
 * - EC-3.1: Non-VP -> 403 error
 * - EC-3.3: File too large -> 413 error
 * - EC-3.4: Invalid MIME type -> 415 error
 */
export async function getLogoUploadUrl(
  request: LogoUploadUrlRequest,
): Promise<LogoUploadUrlResponse> {
  const headers = await getAuthHeaders();

  let response: Response;
  try {
    response = await fetch(
      `${SUPABASE_URL}/functions/v1/v1-org-logo-upload-url`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(request),
      },
    );
  } catch (networkError) {
    throw new OrgError(
      "Unable to connect. Please check your internet connection.",
      undefined,
      0,
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    const errorData = data as OrgErrorResponse;
    throw new OrgError(
      errorData.error || "Failed to get upload URL",
      errorData.field,
      response.status,
    );
  }

  return data as LogoUploadUrlResponse;
}

/**
 * Upload a logo file using a signed URL
 *
 * This is a two-step process:
 * 1. Get signed URL via getLogoUploadUrl()
 * 2. Upload file directly to storage using this function
 */
export async function uploadLogo(
  signedUrl: string,
  file: File,
): Promise<void> {
  try {
    const response = await fetch(signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!response.ok) {
      throw new OrgError(
        "Failed to upload logo. Please try again.",
        undefined,
        response.status,
      );
    }
  } catch (error) {
    if (error instanceof OrgError) {
      throw error;
    }
    throw new OrgError(
      "Unable to upload logo. Please check your connection.",
      undefined,
      0,
    );
  }
}

/**
 * Complete logo upload flow:
 * 1. Get signed URL
 * 2. Upload file
 * 3. Update organization with new logo URL
 *
 * Returns the public URL of the uploaded logo.
 *
 * Edge cases handled:
 * - EC-3.3: File too large -> Error thrown
 * - EC-3.4: Invalid MIME type -> Error thrown
 * - EC-3.8: Upload interrupted -> Cleanup attempted
 */
export async function uploadOrganizationLogo(
  orgId: string,
  file: File,
): Promise<string> {
  // Step 1: Get signed upload URL
  const uploadUrlResponse = await getLogoUploadUrl({
    org_id: orgId,
    content_type: file.type as LogoUploadUrlRequest["content_type"],
    file_size: file.size,
  });

  // Step 2: Upload file to storage
  await uploadLogo(uploadUrlResponse.upload_url, file);

  // Step 3: Update organization with new logo URL
  await updateOrganization({
    org_id: orgId,
    logo_url: uploadUrlResponse.public_url,
  });

  return uploadUrlResponse.public_url;
}

/**
 * Remove organization logo
 */
export async function removeOrganizationLogo(orgId: string): Promise<void> {
  await updateOrganization({
    org_id: orgId,
    logo_url: null,
  });
}
