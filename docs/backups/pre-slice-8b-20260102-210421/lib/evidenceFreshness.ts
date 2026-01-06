import type { Evidence } from "./evidence";

export type EvidenceKind =
  | "payoff_letter"
  | "mortgage_statement"
  | "hoa_estoppel"
  | "foreclosure_docs"
  | "lease_agreement"
  | "insurance_docs"
  | "inspection_report"
  | "property_photos"
  | "title_docs"
  | "other_docs"
  | "intake_document"
  | "title_quote"
  | "insurance_quote"
  | "repair_bid"
  | string;

export type EvidenceStatus =
  | { kind: EvidenceKind; status: "fresh"; updatedAt: string }
  | { kind: EvidenceKind; status: "stale"; updatedAt: string }
  | { kind: EvidenceKind; status: "missing" };

const DEFAULT_WINDOWS_DAYS: Record<string, number> = {
  payoff_letter: 30,
  mortgage_statement: 30,
  hoa_estoppel: 30,
  foreclosure_docs: 14,
  lease_agreement: 90,
  insurance_docs: 30,
  inspection_report: 60,
  property_photos: 30,
  title_docs: 60,
  other_docs: 30,
  intake_document: 30,
  title_quote: 30,
  insurance_quote: 30,
  repair_bid: 60,
};

function isFresh(updatedAt: string, maxAgeDays: number, now: number): boolean {
  const ts = Date.parse(updatedAt);
  if (Number.isNaN(ts)) return false;
  const ageMs = now - ts;
  const windowMs = maxAgeDays * 24 * 60 * 60 * 1000;
  return ageMs <= windowMs;
}

export function buildEvidenceStatus(
  evidence: Evidence[],
  kinds: EvidenceKind[],
  now: number = Date.now(),
  windows: Record<string, number> = DEFAULT_WINDOWS_DAYS,
): EvidenceStatus[] {
  return kinds.map((kind) => {
    const rows = evidence.filter((e) => e.kind === kind);
    if (rows.length === 0) {
      return { kind, status: "missing" };
    }
    const newest = rows.reduce((latest, row) => {
      const ts = Date.parse(row.updatedAt ?? row.createdAt);
      return ts > latest.ts ? { ts, row } : latest;
    }, { ts: -Infinity, row: rows[0] }).row;

    const maxAge = windows[kind] ?? 30;
    const updatedAt = newest.updatedAt ?? newest.createdAt;
    const fresh = updatedAt ? isFresh(updatedAt, maxAge, now) : false;
    return {
      kind,
      status: fresh ? "fresh" : "stale",
      updatedAt: updatedAt ?? "",
    };
  });
}

export function evidenceLabel(kind: EvidenceKind): string {
  const map: Record<string, string> = {
    payoff_letter: "Payoff letter",
    mortgage_statement: "Mortgage statement",
    hoa_estoppel: "HOA estoppel",
    foreclosure_docs: "Foreclosure documents",
    lease_agreement: "Lease agreement",
    insurance_docs: "Insurance documents",
    inspection_report: "Inspection report",
    property_photos: "Property photos",
    title_docs: "Title documents",
    other_docs: "Other documents",
    intake_document: "Intake document",
    title_quote: "Title quote",
    insurance_quote: "Insurance quote",
    repair_bid: "Repair bid",
  };
  return map[kind] ?? kind.replace(/_/g, " ");
}
