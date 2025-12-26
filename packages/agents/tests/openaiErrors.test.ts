import { describe, expect, it } from "vitest";
import { classifyOpenAiError } from "../src/shared/openaiErrors";

describe("classifyOpenAiError", () => {
  it("detects context_length_exceeded by code", () => {
    const err = Object.assign(new Error("Request too large"), {
      code: "context_length_exceeded",
      status: 400,
    });
    const result = classifyOpenAiError(err);
    expect(result.error_code).toBe("context_length_exceeded");
    expect(result.retryable).toBe(true);
  });

  it("detects context_length_exceeded by message", () => {
    const err = new Error("This model's maximum context length is 8192 tokens.");
    const result = classifyOpenAiError(err);
    expect(result.error_code).toBe("context_length_exceeded");
  });

  it("detects invalid_api_key and marks non-retryable", () => {
    const err = Object.assign(new Error("Incorrect API key provided."), {
      code: "invalid_api_key",
      status: 401,
    });
    const result = classifyOpenAiError(err);
    expect(result.error_code).toBe("invalid_api_key");
    expect(result.retryable).toBe(false);
  });

  it("detects insufficient_quota and marks non-retryable", () => {
    const err = Object.assign(new Error("You exceeded your current quota, please check your plan and billing."), {
      code: "insufficient_quota",
      status: 429,
    });
    const result = classifyOpenAiError(err);
    expect(result.error_code).toBe("insufficient_quota");
    expect(result.retryable).toBe(false);
  });
});
