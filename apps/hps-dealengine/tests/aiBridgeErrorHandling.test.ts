import { describe, expect, it, afterEach, vi } from "vitest";
import { askDealAnalyst } from "../lib/aiBridge";

const getSessionMock = vi.fn().mockResolvedValue({
  data: { session: { access_token: "token" } },
});

vi.mock("../lib/supabaseClient", () => ({
  getSupabaseClient: () => ({
    auth: { getSession: getSessionMock },
  }),
}));

describe("aiBridge error handling", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("propagates error_code and retryable from the API response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        ok: false,
        error_code: "context_length_exceeded",
        user_message: "Request too large. Reduce notes/evidence or try again (we'll auto-trim).",
        retryable: true,
      }),
    });
    globalThis.fetch = fetchMock as any;

    const result = await askDealAnalyst({
      dealId: "00000000-0000-0000-0000-000000000001",
      runId: "00000000-0000-0000-0000-000000000002",
      userPrompt: "Summarize the run.",
    });

    expect(result.ok).toBe(false);
    expect(result.error_code).toBe("context_length_exceeded");
    expect(result.retryable).toBe(true);
    expect(result.summary).toContain("Request too large");
  });
});
