export type OpenAiErrorClassification = {
  error_code:
    | "context_length_exceeded"
    | "invalid_api_key"
    | "insufficient_quota"
    | "rate_limited"
    | "dataset_missing"
    | "dataset_invalid"
    | "kb_registry_missing"
    | "unknown_error";
  user_message: string;
  retryable: boolean;
  http_status?: number | null;
};

const USER_MESSAGES: Record<OpenAiErrorClassification["error_code"], string> = {
  rate_limited: "Provider rate limiting. Try again in 30-60 seconds.",
  context_length_exceeded: "Request too large. Reduce notes/evidence or try again (we'll auto-trim).",
  invalid_api_key: "API key invalid or missing. Check OPENAI_API_KEY and try again.",
  insufficient_quota: "API quota exceeded. Check billing/usage, then retry.",
  dataset_missing: "Negotiation dataset missing/invalid. Restore the expected JSON and retry.",
  dataset_invalid: "Negotiation dataset missing/invalid. Restore the expected JSON and retry.",
  kb_registry_missing: "Strategist KB registry missing. Restore the registry and retry.",
  unknown_error: "Unexpected error. Try again.",
};

function extractStatus(err: unknown): number | null {
  const candidates = [
    err as any,
    (err as any)?.response,
    (err as any)?.cause,
    (err as any)?.error,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (typeof candidate.status === "number") return candidate.status;
    if (typeof candidate.statusCode === "number") return candidate.statusCode;
    if (typeof candidate?.response?.status === "number") return candidate.response.status;
  }
  return null;
}

function extractCode(err: unknown): string | null {
  const candidates = [
    err as any,
    (err as any)?.error,
    (err as any)?.response?.data,
    (err as any)?.response?.data?.error,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (typeof candidate.code === "string") return candidate.code;
    if (typeof candidate.type === "string") return candidate.type;
  }
  return null;
}

function extractMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string") return err;
  const candidates = [
    (err as any)?.error?.message,
    (err as any)?.response?.data?.error?.message,
    (err as any)?.response?.data?.message,
    (err as any)?.message,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) return candidate;
  }
  return "";
}

export function classifyOpenAiError(err: unknown): OpenAiErrorClassification {
  const message = extractMessage(err);
  const lowerMessage = message.toLowerCase();
  const status = extractStatus(err);
  const code = extractCode(err);

  const isContextLength =
    code === "context_length_exceeded" ||
    lowerMessage.includes("context_length_exceeded") ||
    lowerMessage.includes("maximum context length");

  if (isContextLength) {
    return {
      error_code: "context_length_exceeded",
      user_message: USER_MESSAGES.context_length_exceeded,
      retryable: true,
      http_status: status ?? 400,
    };
  }

  const isInvalidApiKey =
    status === 401 ||
    code === "invalid_api_key" ||
    lowerMessage.includes("incorrect api key");

  if (isInvalidApiKey) {
    return {
      error_code: "invalid_api_key",
      user_message: USER_MESSAGES.invalid_api_key,
      retryable: false,
      http_status: status ?? 401,
    };
  }

  const isInsufficientQuota =
    code === "insufficient_quota" ||
    lowerMessage.includes("exceeded your current quota");

  if (isInsufficientQuota) {
    return {
      error_code: "insufficient_quota",
      user_message: USER_MESSAGES.insufficient_quota,
      retryable: false,
      http_status: status ?? 429,
    };
  }

  const isRateLimit =
    status === 429 ||
    code === "rate_limit_exceeded" ||
    (typeof code === "string" && code.toLowerCase().includes("rate_limit")) ||
    lowerMessage.includes("rate limit") ||
    lowerMessage.includes("too many requests");

  if (isRateLimit) {
    return {
      error_code: "rate_limited",
      user_message: USER_MESSAGES.rate_limited,
      retryable: true,
      http_status: status ?? 429,
    };
  }

  const isNegotiatorDatasetError =
    lowerMessage.includes("negotiation matrix dataset") ||
    lowerMessage.includes("negotiation-matrix");
  if (isNegotiatorDatasetError) {
    const invalid = lowerMessage.includes("schema validation failed");
    return {
      error_code: invalid ? "dataset_invalid" : "dataset_missing",
      user_message: USER_MESSAGES.dataset_missing,
      retryable: true,
      http_status: status ?? 400,
    };
  }

  const isKbRegistryMissing =
    lowerMessage.includes("kb registry") && lowerMessage.includes("not found");
  if (isKbRegistryMissing) {
    return {
      error_code: "kb_registry_missing",
      user_message: USER_MESSAGES.kb_registry_missing,
      retryable: true,
      http_status: status ?? 400,
    };
  }

  return {
    error_code: "unknown_error",
    user_message: USER_MESSAGES.unknown_error,
    retryable: true,
    http_status: status ?? null,
  };
}
