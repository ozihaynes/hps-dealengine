import { describe, expect, it } from "vitest";
import { SaveRunArgsSchema, buildRunRow } from "./runsSave";

const baseArgs = {
  orgId: "11111111-2222-3333-4444-555555555555",
  dealId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  posture: "base",
  deal: { market: { arv: 123000 }, costs: { repairs_base: 10000 } },
  sandbox: { aivSafetyCapPercentage: 90 },
  outputs: { aiv: 120000, buyer_ceiling: 100000 },
  trace: [{ key: "inputs", label: "Normalized inputs" }],
  meta: { engineVersion: "v-test", policyVersion: "p-test" },
  policySnapshot: { token: "policy-json" },
  repairProfile: { id: "profile-1" },
};

describe("buildRunRow", () => {
  it("produces deterministic hashes for identical logical inputs", () => {
    const rowA = buildRunRow(baseArgs);
    const rowB = buildRunRow({ ...baseArgs });

    expect(rowA.input_hash).toBe(rowB.input_hash);
    expect(rowA.output_hash).toBe(rowB.output_hash);
    expect(rowA.policy_hash).toBe(rowB.policy_hash);
    expect(rowA.deal_id).toBe(baseArgs.dealId);
    expect(rowA.policy_snapshot).toEqual(baseArgs.policySnapshot);
  });

  it("is stable regardless of object key order", () => {
    const rowA = buildRunRow({
      ...baseArgs,
      deal: { b: 2, a: 1 },
      sandbox: { z: true, a: { b: 1, a: 2 } },
    });
    const rowB = buildRunRow({
      ...baseArgs,
      deal: { a: 1, b: 2 },
      sandbox: { a: { a: 2, b: 1 }, z: true },
    });

    expect(rowA.input_hash).toBe(rowB.input_hash);
  });

  it("fails validation when required fields are missing", () => {
    const result = SaveRunArgsSchema.safeParse({
      ...baseArgs,
      dealId: undefined as any,
    });
    expect(result.success).toBe(false);
  });
});
