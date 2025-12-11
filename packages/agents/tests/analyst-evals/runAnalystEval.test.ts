import { describe, expect, it, vi } from "vitest";
import cases from "./golden-deals.json";
import { runAnalystAgent } from "../../src/analyst/dealAnalystAgent";

vi.mock("@openai/agents", () => {
  return {
    Agent: class Agent {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      constructor(public config: any) {}
    },
    setDefaultOpenAIKey: vi.fn(),
    run: vi.fn(async () => ({
      finalOutput: "Synthetic analyst summary.",
      lastResponseId: "trace-test",
    })),
    tool: (cfg: any) => cfg,
  };
});

vi.mock("../../src/analyst/tools", () => {
  return {
    loadAnalystRunContext: vi.fn(async () => {
      const sample = (cases as any)[0];
      return {
        orgId: "00000000-0000-0000-0000-0000000000aa",
        userId: "00000000-0000-0000-0000-0000000000bb",
        dealId: sample.id,
        runId: "00000000-0000-0000-0000-0000000000cc",
        runCreatedAt: new Date().toISOString(),
        isStale: false,
        outputs: sample.outputs as any,
        policySnapshot: null,
        trace: [],
      };
    }),
  };
});

describe("runAnalystAgent (mocked)", () => {
  it("returns AiBridgeResult with deterministic key numbers", async () => {
    const result = await runAnalystAgent({
      orgId: "00000000-0000-0000-0000-0000000000aa",
      userId: "00000000-0000-0000-0000-0000000000bb",
      dealId: "00000000-0000-0000-0000-000000000001",
      accessToken: "test-token",
      question: "Explain the run",
    });

    expect(result.aiResult.persona).toBe("dealAnalyst");
    expect(result.aiResult.key_numbers?.body).toContain("ARV");
    expect(result.aiResult.key_numbers?.body).toContain("$250,000");
    expect(result.status).toBe("succeeded");
    expect(result.runContext?.isStale).toBe(false);
  });
});
