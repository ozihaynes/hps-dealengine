import type { SandboxConfig } from "@hps-internal/contracts";
import { SANDBOX_V1_KNOBS } from "@/constants/sandboxKnobs";
import type { EvidenceStatus } from "./evidenceFreshness";
import type { PolicyOverride } from "./policyOverrides";

const fmt = (val: unknown): string => {
  if (val === null || typeof val === "undefined") return "n/a";
  if (typeof val === "number") return Number.isFinite(val) ? val.toFixed(2) : "n/a";
  if (typeof val === "boolean") return val ? "true" : "false";
  return String(val);
};

export function summarizeStrategistContext(params: {
  runOutput: any;
  sandbox: SandboxConfig;
  evidenceStatus?: EvidenceStatus[];
  overrides?: PolicyOverride[];
}): string {
  const { runOutput, sandbox, evidenceStatus = [], overrides = [] } = params;
  const outputs = (runOutput as any)?.outputs ?? {};
  const lines: string[] = [];

  const kpis = [
    ["ARV", outputs.arv],
    ["AIV", outputs.aiv],
    ["Buyer Ceiling", outputs.buyer_ceiling ?? outputs.buyerCeiling],
    ["Respect Floor", outputs.respect_floor ?? outputs.respectFloorPrice],
    ["Wholesale Fee", outputs.wholesale_fee ?? outputs.wholesale_fee_dc],
  ]
    .filter(([, v]) => typeof v !== "undefined" && v !== null)
    .map(([k, v]) => `${k}: ${fmt(v)}`);
  if (kpis.length > 0) {
    lines.push(`Run outputs: ${kpis.join(", ")}`);
  }

  const knobs = SANDBOX_V1_KNOBS.map((k) => {
    const val = (sandbox as any)?.[k.key];
    if (typeof val === "undefined") return null;
    return `${k.label}: ${fmt(val)}`;
  }).filter(Boolean) as string[];
  if (knobs.length > 0) {
    lines.push(`Sandbox v1 knobs: ${knobs.join("; ")}`);
  }

  if (evidenceStatus.length > 0) {
    const ev = evidenceStatus
      .map((e) => `${e.kind} => ${e.status}${"updatedAt" in e ? ` (${(e as any).updatedAt})` : ""}`)
      .join("; ");
    lines.push(`Evidence: ${ev}`);
  }

  const approved = overrides.filter((o) => o.status === "approved");
  if (approved.length > 0) {
    const ov = approved
      .map(
        (o) =>
          `${o.tokenKey}: ${fmt(o.oldValue)} -> ${fmt(o.newValue)} (approved ${
            o.approvedAt ?? ""
          })`,
      )
      .join("; ");
    lines.push(`Overrides: ${ov}`);
  }

  lines.push(
    "Guardrails: advisory only; cite run outputs, sandbox knobs, evidence, and approved overrides; do not invent numbers or change policy.",
  );

  return lines.join("\n");
}
