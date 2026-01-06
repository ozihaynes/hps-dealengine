import { describe, expect, it, vi } from "vitest";
import { buildEvidenceStatus, evidenceLabel } from "./evidenceFreshness";

const now = Date.parse("2025-12-04T12:00:00Z");

const sample = [
  {
    id: "1",
    orgId: "org",
    dealId: "deal",
    runId: null,
    kind: "payoff_letter",
    storageKey: "a",
    filename: "payoff.pdf",
    mimeType: "application/pdf",
    bytes: 100,
    sha256: "a".repeat(64),
    createdBy: "user",
    createdAt: "2025-12-01T00:00:00Z",
    updatedAt: "2025-12-02T00:00:00Z",
  },
  {
    id: "2",
    orgId: "org",
    dealId: "deal",
    runId: null,
    kind: "repair_bid",
    storageKey: "b",
    filename: "bid.pdf",
    mimeType: "application/pdf",
    bytes: 100,
    sha256: "b".repeat(64),
    createdBy: "user",
    createdAt: "2025-10-01T00:00:00Z",
    updatedAt: "2025-10-05T00:00:00Z",
  },
];

describe("evidence freshness", () => {
  it("marks fresh vs stale vs missing", () => {
    const statuses = buildEvidenceStatus(
      sample as any,
      ["payoff_letter", "title_quote", "repair_bid"],
      now,
      { payoff_letter: 10, title_quote: 7, repair_bid: 30 },
    );

    const payoff = statuses.find((s) => s.kind === "payoff_letter")!;
    expect(payoff.status).toBe("fresh");

    const title = statuses.find((s) => s.kind === "title_quote")!;
    expect(title.status).toBe("missing");

    const repair = statuses.find((s) => s.kind === "repair_bid")!;
    expect(repair.status).toBe("stale");
  });

  it("labels kinds human-readably", () => {
    expect(evidenceLabel("payoff_letter")).toBe("Payoff letter");
    expect(evidenceLabel("custom_kind")).toBe("custom kind");
  });

  it("treats missing evidence as missing for all kinds", () => {
    const statuses = buildEvidenceStatus([], ["payoff_letter", "repair_bid"], now);
    expect(statuses).toEqual([
      { kind: "payoff_letter", status: "missing" },
      { kind: "repair_bid", status: "missing" },
    ]);
  });

  it("falls back to createdAt when updatedAt is absent", () => {
    const noUpdate = [
      {
        ...sample[0],
        id: "3",
        kind: "title_quote",
        updatedAt: undefined,
        createdAt: "2025-12-03T00:00:00Z",
      },
    ];

    const statuses = buildEvidenceStatus(
      [...sample, ...noUpdate] as any,
      ["title_quote"],
      now,
      { title_quote: 10 },
    );

    expect(statuses[0]).toMatchObject({
      kind: "title_quote",
      status: "fresh",
      updatedAt: "2025-12-03T00:00:00Z",
    });
  });
});
