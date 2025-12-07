import { describe, expect, it } from "vitest";
import { buildPrompt } from "./prompt";

describe("v1-ai-bridge prompt builder", () => {
  it("includes core context pieces", () => {
    const prompt = buildPrompt(
      {
        posture: "base",
        output: { result: 1 },
        trace: [{ key: "start", label: "Start" }],
        policy_snapshot: { version: "v1" },
      },
      "Hello strategist",
      [
        { id: "e1", kind: "photo", storage_key: "path/file", bytes: 100 },
      ],
      ["guardrail-a", "guardrail-b"],
    );

    expect(prompt).toContain("Hello strategist");
    expect(prompt).toContain("guardrail-a");
    expect(prompt).toContain("Posture: base");
    expect(prompt).toContain("result");
    expect(prompt).toContain("Policy snapshot");
    expect(prompt).toContain("e1");
  });
});
