/**
 * Public intake form client helpers.
 *
 * These functions are used by the public /intake/[token] page
 * and do NOT require authentication. Token is passed via header.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/**
 * API response types for intake form schema.
 * Note: Field types are strings from the API, not strict enums.
 */
export type IntakeFieldCondition = {
  field: string;
  equals: unknown;
};

export type IntakeFieldOption = {
  value: string;
  label: string;
} | string;

export type IntakeFieldApi = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: IntakeFieldOption[];
  placeholder?: string;
  helpText?: string;
  min?: number;
  max?: number;
  pattern?: string;
  condition?: IntakeFieldCondition;
  description?: string;
};

export type IntakeSectionApi = {
  id: string;
  title: string;
  description?: string;
  fields: IntakeFieldApi[];
};

export type IntakeSchemaApi = {
  version: string;
  title: string;
  description?: string;
  sections: IntakeSectionApi[];
  evidence_uploads?: unknown[];
};

type ValidateTokenResponse = {
  valid: boolean;
  link_id?: string;
  schema?: IntakeSchemaApi;
  existing_payload?: Record<string, unknown>;
  recipient_name?: string;
  expires_at?: string;
  deal_context?: {
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  };
  error?: string;
  message?: string;
};

type SaveDraftResponse = {
  submission_id?: string;
  status?: string;
  updated_at?: string;
  ok?: boolean;
  error?: string;
  message?: string;
};

type SubmitResponse = {
  submission_id?: string;
  status?: string;
  submitted_at?: string;
  message?: string;
  ok?: boolean;
  error?: string;
  missing_fields?: string[];
};

type UploadStartResponse = {
  file_id?: string;
  submission_id?: string;
  object_key?: string;
  upload_url?: string;
  upload_token?: string;
  expires_in_seconds?: number;
  ok?: boolean;
  error?: string;
  message?: string;
};

type UploadCompleteResponse = {
  file_id?: string;
  scan_status?: string;
  storage_state?: string;
  scanned_at?: string;
  already_scanned?: boolean;
  ok?: boolean;
  error?: string;
  message?: string;
};

/**
 * Validate an intake token.
 * Returns schema and existing submission if valid.
 */
export async function validateIntakeToken(
  token: string,
): Promise<ValidateTokenResponse> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/v1-intake-validate-token`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-intake-token": token,
      },
    },
  );

  const data = (await response.json()) as ValidateTokenResponse;
  return data;
}

/**
 * Save a draft submission.
 * Called by auto-save and when navigating between sections.
 */
export async function saveIntakeDraft(
  token: string,
  linkId: string,
  payload: Record<string, unknown>,
): Promise<SaveDraftResponse> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/v1-intake-save-draft`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-intake-token": token,
      },
      body: JSON.stringify({
        intake_link_id: linkId,
        payload_json: payload,
      }),
    },
  );

  const data = (await response.json()) as SaveDraftResponse;

  if (!response.ok || data.ok === false) {
    throw new Error(data.message ?? data.error ?? "Failed to save draft");
  }

  return data;
}

/**
 * Submit the final intake form.
 * Validates required fields and freezes the payload.
 */
export async function submitIntake(
  token: string,
  linkId: string,
  payload: Record<string, unknown>,
): Promise<SubmitResponse> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/v1-intake-submit`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-intake-token": token,
      },
      body: JSON.stringify({
        intake_link_id: linkId,
        payload_json: payload,
      }),
    },
  );

  const data = (await response.json()) as SubmitResponse;

  if (!response.ok || data.ok === false) {
    if (data.error === "VALIDATION_FAILED" && data.missing_fields) {
      throw new Error(
        `Missing required fields: ${data.missing_fields.join(", ")}`,
      );
    }
    throw new Error(data.message ?? data.error ?? "Failed to submit form");
  }

  return data;
}

/**
 * Start a file upload.
 * Returns signed URL for direct upload to storage.
 */
export async function startIntakeUpload(
  token: string,
  linkId: string,
  file: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    uploadKey?: string;
  },
): Promise<{
  fileId: string;
  submissionId: string;
  uploadUrl: string;
  uploadToken: string;
}> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/v1-intake-upload-start`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-intake-token": token,
      },
      body: JSON.stringify({
        intake_link_id: linkId,
        filename: file.filename,
        mime_type: file.mimeType,
        size_bytes: file.sizeBytes,
        upload_key: file.uploadKey,
      }),
    },
  );

  const data = (await response.json()) as UploadStartResponse;

  if (!response.ok || data.ok === false || !data.upload_url) {
    throw new Error(data.message ?? data.error ?? "Failed to start upload");
  }

  return {
    fileId: data.file_id!,
    submissionId: data.submission_id!,
    uploadUrl: data.upload_url,
    uploadToken: data.upload_token!,
  };
}

/**
 * Complete a file upload.
 * Triggers virus scan and updates file status.
 */
export async function completeIntakeUpload(
  token: string,
  linkId: string,
  fileId: string,
): Promise<{
  scanStatus: string;
  storageState: string;
}> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/v1-intake-upload-complete`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-intake-token": token,
      },
      body: JSON.stringify({
        intake_link_id: linkId,
        file_id: fileId,
      }),
    },
  );

  const data = (await response.json()) as UploadCompleteResponse;

  if (!response.ok || data.ok === false) {
    throw new Error(data.message ?? data.error ?? "Failed to complete upload");
  }

  return {
    scanStatus: data.scan_status ?? "PENDING",
    storageState: data.storage_state ?? "QUARANTINE",
  };
}
