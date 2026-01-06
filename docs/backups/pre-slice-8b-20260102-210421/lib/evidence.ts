"use client";

import type {
  Evidence,
  EvidenceStartInput,
} from "@hps-internal/contracts";
import { getSupabaseClient } from "@/lib/supabaseClient";

type UploadParams = {
  dealId: string;
  runId?: string | null;
  kind: string;
  file: File;
};

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  const arr = Array.from(new Uint8Array(hash));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type { Evidence };

function mapEvidenceRow(row: any): Evidence {
  return {
    id: row.id,
    orgId: row.org_id ?? row.orgId,
    dealId: row.deal_id ?? row.dealId,
    runId: row.run_id ?? row.runId ?? null,
    kind: row.kind,
    storageKey: row.storage_key ?? row.storageKey,
    filename: row.filename,
    mimeType: row.mime_type ?? row.mimeType,
    bytes: row.bytes,
    sha256: row.sha256,
    createdBy: row.created_by ?? row.createdBy,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

export async function uploadEvidence(params: UploadParams): Promise<Evidence> {
  const supabase = getSupabaseClient();
  const { dealId, runId, kind, file } = params;

  const sha256 = await sha256Hex(file);
  const bytes = file.size;
  const mimeType = file.type || "application/octet-stream";

  const payload: EvidenceStartInput = {
    dealId,
    runId: runId ?? null,
    kind,
    filename: file.name,
    bytes,
    sha256,
    mimeType,
  };

  const { data, error } = await supabase.functions.invoke("v1-evidence-start", {
    body: payload,
  });

  if (error || !data?.ok) {
    const message =
      (error as any)?.message ??
      (data as any)?.error ??
      "Failed to start evidence upload";
    throw new Error(message);
  }

  const { storageKey, token, evidence } = data as {
    storageKey: string;
    token: string;
    uploadUrl?: string | null;
    evidence: any;
  };

  const uploadRes = await supabase.storage
    .from("evidence")
    .uploadToSignedUrl(storageKey, token, file);

  if (uploadRes.error) {
    throw new Error(uploadRes.error.message);
  }

  return mapEvidenceRow(evidence);
}

export async function listEvidence(opts: {
  dealId?: string;
  runId?: string | null;
}): Promise<Evidence[]> {
  const supabase = getSupabaseClient();

  const query = supabase
    .from("evidence")
    .select(
      "id, org_id, deal_id, run_id, kind, storage_key, filename, sha256, bytes, mime_type, created_at, created_by, updated_at",
    )
    .order("created_at", { ascending: false });

  if (opts.runId) {
    query.eq("run_id", opts.runId);
  }
  if (opts.dealId) {
    query.eq("deal_id", opts.dealId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapEvidenceRow);
}

export async function getEvidenceUrl(evidenceId: string, expiresIn = 300) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke("v1-evidence-url", {
    body: { evidenceId, expiresIn },
  });

  if (error || !data?.ok) {
    const message = (error as any)?.message ?? data?.error ?? "Failed to sign evidence URL";
    throw new Error(message);
  }

  return (data as any).url as string;
}
