import { describe, it, expect } from "vitest";
import {
  SaveRunArgsSchema,
  buildRunRow,
  type RunRowInsert,
} from "@hps-internal/contracts";

describe("buildRunRow", () => {
  it("builds a runs row payload matching the contract", () => {
    const args = SaveRunArgsSchema.parse({
      orgId: "11111111-1111-1111-1111-111111111111",
      dealId: "22222222-2222-2222-2222-222222222222",
      posture: "base",
      deal: {
        arv: 250000,
        aiv: 200000,
        dom: 45,
      },
      sandbox: {
        note: "unit-test",
      },
      outputs: {
        aivSafetyCap: 200000,
        carryMonths: 1,
      },
      trace: [
        {
          key: "inputs",
          label: "Normalized inputs",
          details: {
            arv: 250000,
            aiv: 200000,
            dom: 45,
          },
        },
        {
          key: "aiv_safety_cap",
          label: "AIV safety cap at 90% of ARV",
          details: {
            aiv: 200000,
            arv: 250000,
            aivSafetyCap: 200000,
          },
        },
        {
          key: "carry_months",
          label: "Carry months capped between 0 and 6",
          details: {
            dom: 45,
            carryMonths: 1,
          },
        },
      ],
      meta: {
        engineVersion: "test-engine",
        policyVersion: "test-policy",
        source: "unit-test",
        durationMs: 12,
      },
      policySnapshot: {
        foo: "bar",
      },
      repairProfile: {
        profileId: "33333333-3333-3333-3333-333333333333",
        marketCode: "ORL",
        posture: "base",
      },
    });

    const row: RunRowInsert = buildRunRow(args);

    // Core identity mapping
    expect(row.org_id).toBe("11111111-1111-1111-1111-111111111111");
    expect(row.posture).toBe("base");

    // Input envelope should reflect posture + deal/sandbox
    expect(row.input.posture).toBe("base");
    expect(row.input.deal).toEqual(args.deal);
    expect(row.input.sandbox).toEqual(args.sandbox);
    expect(row.input.dealId).toBe(args.dealId);
    expect(row.input.repairProfile).toEqual(args.repairProfile);

    // Output/trace mapping
    expect(row.output.outputs).toEqual(args.outputs);
    expect(row.output.trace).toEqual(args.trace);
    expect(row.trace).toEqual(args.trace);

    // Policy snapshot passthrough
    expect(row.policy_snapshot).toEqual(args.policySnapshot);

    // Hashes should be non-empty deterministic strings
    expect(typeof row.input_hash).toBe("string");
    expect(typeof row.output_hash).toBe("string");
    expect(row.input_hash.length).toBeGreaterThan(0);
    expect(row.output_hash.length).toBeGreaterThan(0);
  });
});
