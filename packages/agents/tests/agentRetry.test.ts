import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { runAnalystAgent } from "../src/analyst/dealAnalystAgent";
import { runStrategistAgent } from "../src/strategist/strategistAgent";
import { runNegotiatorAgent } from "../src/negotiator/negotiatorAgent";

const runMock = vi.hoisted(() => vi.fn());
const loadAnalystRunContextMock = vi.hoisted(() => vi.fn());
const resolveNegotiationPlanMock = vi.hoisted(() => vi.fn());
const getKpiSnapshotMock = vi.hoisted(() => vi.fn());
const getRiskGateStatsMock = vi.hoisted(() => vi.fn());
const getSandboxSettingsMock = vi.hoisted(() => vi.fn());
const kbSearchStrategistMock = vi.hoisted(() => vi.fn());

vi.mock("@openai/agents", () => ({
  Agent: class {},
  run: runMock,
  setDefaultOpenAIKey: vi.fn(),
}));

vi.mock("../src/analyst/tools", () => ({
  loadAnalystRunContext: loadAnalystRunContextMock,
}));

vi.mock("../src/negotiator/shared", () => ({
  resolveNegotiationPlan: resolveNegotiationPlanMock,
}));

vi.mock("../src/strategist/shared", () => ({
  getKpiSnapshot: getKpiSnapshotMock,
  getRiskGateStats: getRiskGateStatsMock,
  getSandboxSettings: getSandboxSettingsMock,
  kbSearchStrategist: kbSearchStrategistMock,
}));

vi.mock("../src/supabase/supabaseRlsClient", () => ({
  createSupabaseRlsClient: vi.fn(() => ({})),
}));

describe("agent auto-trim retry", () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv, OPENAI_API_KEY: "sk-test" };
    runMock.mockReset();
    loadAnalystRunContextMock.mockReset();
    resolveNegotiationPlanMock.mockReset();
    getKpiSnapshotMock.mockReset();
    getRiskGateStatsMock.mockReset();
    getSandboxSettingsMock.mockReset();
    kbSearchStrategistMock.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
  });

  it("retries analyst once on context_length_exceeded", async () => {
    loadAnalystRunContextMock.mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      dealId: "deal-1",
      runId: "run-1",
      runCreatedAt: "2024-01-01T00:00:00Z",
      isStale: false,
      outputs: { primary_offer: 120000, risk_summary: { overall: "pass", per_gate: {} } },
      trace: [],
    });
    runMock
      .mockRejectedValueOnce(Object.assign(new Error("max context length"), { code: "context_length_exceeded", status: 400 }))
      .mockResolvedValueOnce({ finalOutput: "ok", lastResponseId: "resp-1", usage: { total_tokens: 12 } });

    const result = await runAnalystAgent({
      orgId: "org-1",
      userId: "user-1",
      dealId: "deal-1",
      accessToken: "token",
      runId: "run-1",
      question: "Quick summary?",
    });

    expect(runMock).toHaveBeenCalledTimes(2);
    expect(result.didAutoTrimRetry).toBe(true);
  });

  it("retries strategist once on context_length_exceeded", async () => {
    getKpiSnapshotMock.mockResolvedValue({
      dealCount: 1,
      runCount: 1,
      readyForOfferCount: 1,
      spreadBands: { medium: 1 },
      assignmentFeeBands: { "5k-15k": 1 },
      timelineUrgency: { high: 1 },
    });
    getRiskGateStatsMock.mockResolvedValue({
      totalRuns: 1,
      gates: { risk_summary: { pass: 1, watch: 0, fail: 0, missing: 0 } },
    });
    getSandboxSettingsMock.mockResolvedValue({ posture: "base", config: {}, presetName: null });
    kbSearchStrategistMock.mockResolvedValue([{ docId: "doc-1", trustTier: 1, text: "kb text" }]);

    runMock
      .mockRejectedValueOnce(Object.assign(new Error("context_length_exceeded"), { code: "context_length_exceeded" }))
      .mockResolvedValueOnce({ finalOutput: "{\"answer\":\"ok\"}", usage: { total_tokens: 6 } });

    const result = await runStrategistAgent({
      orgId: "org-1",
      userId: "user-1",
      accessToken: "token",
      question: "Strategy?",
      focusArea: "sandbox",
    });

    expect(runMock).toHaveBeenCalledTimes(2);
    expect(result.didAutoTrimRetry).toBe(true);
  });

  it("retries negotiator once on context_length_exceeded", async () => {
    resolveNegotiationPlanMock.mockResolvedValue({
      deal: { id: "deal-1", org_id: "org-1", updated_at: null },
      run: { id: "run-1", output: { outputs: { primary_offer: 100000 } }, policy_snapshot: {} },
      negotiationPlan: {
        id: "plan-1",
        module: "competence",
        scenarioLabel: "baseline",
        dealFacts: { condition_band: "light", repairs_band: "low" },
        triggerPhrase: "trigger",
        scriptBody: "script body",
      },
    });

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { code: "context_length_exceeded", message: "max context length" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ output_text: "{\"answer\":\"ok\"}", usage: { total_tokens: 10 } }),
      });
    globalThis.fetch = fetchMock as any;

    const result = await runNegotiatorAgent({
      orgId: "org-1",
      userId: "user-1",
      dealId: "deal-1",
      accessToken: "token",
      question: "What should I say?",
      sellerContext: "Seller needs to move quickly.",
      runId: "run-1",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.didAutoTrimRetry).toBe(true);
  });
});
