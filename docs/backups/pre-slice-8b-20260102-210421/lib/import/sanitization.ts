// =============================================================================
// CSV INJECTION PREVENTION
// =============================================================================

/**
 * Characters that can trigger formula injection in spreadsheets
 * Per OWASP guidelines: https://owasp.org/www-community/attacks/CSV_Injection
 */
const DANGEROUS_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Sanitize a string value to prevent CSV/formula injection
 * Prefixes dangerous characters with a single quote
 */
export function sanitizeForCsv(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  const str = String(value);

  // Check if the string starts with a dangerous character
  if (DANGEROUS_PREFIXES.some((prefix) => str.startsWith(prefix))) {
    return `'${str}`;
  }

  return str;
}

/**
 * Sanitize an entire row object for CSV export
 */
export function sanitizeRowForCsv(
  row: Record<string, unknown>
): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(row)) {
    sanitized[key] = sanitizeForCsv(value as string);
  }

  return sanitized;
}

// =============================================================================
// INPUT SANITIZATION
// =============================================================================

/**
 * Remove potentially dangerous characters from user input
 */
export function sanitizeInput(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  return (
    String(value)
      // Remove null bytes
      .replace(/\0/g, "")
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      // Trim whitespace
      .trim()
  );
}

/**
 * Sanitize an entire payload object
 */
export function sanitizePayload(
  payload: Record<string, unknown>
): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeInput(value);
    } else if (value !== null && value !== undefined) {
      sanitized[key] = sanitizeInput(String(value));
    } else {
      sanitized[key] = "";
    }
  }

  return sanitized;
}

// =============================================================================
// FILE VALIDATION
// =============================================================================

export const FILE_LIMITS = {
  MAX_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
  MAX_SIZE_MB: 50,
  MAX_ROWS: 10_000,
  ALLOWED_EXTENSIONS: [".csv", ".xlsx", ".xls", ".json"],
  ALLOWED_MIME_TYPES: [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/json",
  ],
} as const;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate file before processing
 */
export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > FILE_LIMITS.MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size of ${FILE_LIMITS.MAX_SIZE_MB}MB`,
    };
  }

  // Check file extension
  const extension = getFileExtension(file.name).toLowerCase();
  if (!FILE_LIMITS.ALLOWED_EXTENSIONS.includes(extension as typeof FILE_LIMITS.ALLOWED_EXTENSIONS[number])) {
    return {
      valid: false,
      error: `File type "${extension}" is not supported. Allowed types: ${FILE_LIMITS.ALLOWED_EXTENSIONS.join(", ")}`,
    };
  }

  // Check MIME type (with fallback for extension-based detection)
  const mimeType = file.type || getMimeTypeFromExtension(extension);
  if (mimeType && !FILE_LIMITS.ALLOWED_MIME_TYPES.includes(mimeType as typeof FILE_LIMITS.ALLOWED_MIME_TYPES[number])) {
    // Allow if extension is valid but MIME is unknown
    if (!FILE_LIMITS.ALLOWED_EXTENSIONS.includes(extension as typeof FILE_LIMITS.ALLOWED_EXTENSIONS[number])) {
      return {
        valid: false,
        error: `File type "${mimeType}" is not supported`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate row count
 */
export function validateRowCount(rowCount: number): FileValidationResult {
  if (rowCount > FILE_LIMITS.MAX_ROWS) {
    return {
      valid: false,
      error: `File has ${rowCount.toLocaleString()} rows, which exceeds the maximum of ${FILE_LIMITS.MAX_ROWS.toLocaleString()} rows`,
    };
  }

  if (rowCount === 0) {
    return {
      valid: false,
      error: "File contains no data rows",
    };
  }

  return { valid: true };
}

// =============================================================================
// HELPERS
// =============================================================================

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot !== -1 ? filename.slice(lastDot) : "";
}

function getMimeTypeFromExtension(ext: string): string | null {
  const mimeMap: Record<string, string> = {
    ".csv": "text/csv",
    ".xlsx":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls": "application/vnd.ms-excel",
    ".json": "application/json",
  };
  return mimeMap[ext] || null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
