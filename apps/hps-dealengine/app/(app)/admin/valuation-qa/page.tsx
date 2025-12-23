"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Comp, ValuationRun } from "@hps-internal/contracts";
import { useRouter } from "next/navigation";

import { Badge, Button, GlassCard, InputField } from "@/components/ui";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { resolveOrgId } from "@/lib/deals";
import { getActiveOrgMembershipRole, type OrgMembershipRole } from "@/lib/orgMembership";
import { uploadEvidence } from "@/lib/evidence";

type GroundTruthRow = {
  id: string;
  deal_id: string | null;
  subject_key: string;
  source: string;
  realized_price: number;
  realized_date: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type EvalRunRow = {
  id: string;
  dataset_name: string;
  posture?: string | null;
  created_at?: string | null;
  metrics?: any;
  params?: any;
};

type ValuationRunRow = Pick<ValuationRun, "id" | "deal_id" | "created_at" | "output"> & {
  provenance?: unknown;
};

type CompOverrideRow = {
  org_id: string;
  deal_id: string;
  comp_id: string;
  comp_kind: string;
  seller_credit_pct?: number | null;
  seller_credit_usd?: number | null;
  condition_adjustment_usd?: number | null;
  notes: string;
};

type OverrideInputs = {
  seller_credit_pct?: string;
  seller_credit_usd?: string;
  condition_adjustment_usd?: string;
  notes?: string;
};

type GroundTruthForm = {
  dealId: string;
  source: string;
  realizedPrice: string;
  realizedDate: string;
  notes: string;
};

type CalibrationForm = {
  dealId: string;
  actual: string;
  observedAt: string;
  compEstimate: string;
  avmEstimate: string;
  note: string;
};

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 2 });
const postureOptions = ["base", "conservative", "aggressive"] as const;

export default function ValuationQaPage() {
  const supabase = getSupabaseClient();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [role, setRole] = useState<OrgMembershipRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [groundTruthRows, setGroundTruthRows] = useState<GroundTruthRow[]>([]);
  const [evalRuns, setEvalRuns] = useState<EvalRunRow[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [valuationRuns, setValuationRuns] = useState<ValuationRunRow[]>([]);
  const [selectedValuationRunId, setSelectedValuationRunId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, CompOverrideRow>>({});
  const [overrideInputs, setOverrideInputs] = useState<Record<string, OverrideInputs>>({});
  const [generateDatasetName, setGenerateDatasetName] = useState("ground_truth_v1");
  const [generatePosture, setGeneratePosture] = useState<(typeof postureOptions)[number]>("base");
  const [generateLimit, setGenerateLimit] = useState<number>(50);
  const [generateForce, setGenerateForce] = useState(false);
  const [generatingEvalRun, setGeneratingEvalRun] = useState(false);
  const [lastEvalInputHash, setLastEvalInputHash] = useState<string | null>(null);
  const [lastEvalDeduped, setLastEvalDeduped] = useState(false);
  const [sweepStep, setSweepStep] = useState<number>(0.05);
  const [sweepApplyCap, setSweepApplyCap] = useState<boolean>(false);
  const [sweepResults, setSweepResults] = useState<any[] | null>(null);
  const [sweepBestMae, setSweepBestMae] = useState<any | null>(null);
  const [sweepBestMape, setSweepBestMape] = useState<any | null>(null);
  const [sweepLoading, setSweepLoading] = useState(false);
  const [sweepError, setSweepError] = useState<string | null>(null);
  const [sweepDiagnostics, setSweepDiagnostics] = useState<any | null>(null);
  const router = useRouter();

  const [form, setForm] = useState<GroundTruthForm>({
    dealId: "",
    source: "sale_price",
    realizedPrice: "",
    realizedDate: "",
    notes: "",
  });
  const [savingForm, setSavingForm] = useState(false);

  const [calibrationForm, setCalibrationForm] = useState<CalibrationForm>({
    dealId: "",
    actual: "",
    observedAt: "",
    compEstimate: "",
    avmEstimate: "",
    note: "",
  });
  const [calibrationLoading, setCalibrationLoading] = useState(false);
  const [calibrationError, setCalibrationError] = useState<string | null>(null);
  const [calibrationResult, setCalibrationResult] = useState<any | null>(null);
  const [calibrationEvidenceId, setCalibrationEvidenceId] = useState<string | null>(null);

  const isAdmin = useMemo(
    () => role === "owner" || role === "vp" || role === "manager",
    [role],
  );

  const refreshGroundTruth = useCallback(async (org: string | null = orgId) => {
    if (!org) return;
    const { data, error: gtError } = await supabase
      .from("valuation_ground_truth")
      .select("*")
      .eq("org_id", org)
      .order("created_at", { ascending: false })
      .limit(50);
    if (gtError) {
      setError(gtError.message ?? "Unable to load ground truth records.");
      return;
    }
    setGroundTruthRows((data as GroundTruthRow[]) ?? []);
  }, [supabase, orgId]);

  const refreshEvalRuns = useCallback(async (org: string | null = orgId) => {
    if (!org) return;
    const { data, error: evalError } = await supabase
      .from("valuation_eval_runs")
      .select("*")
      .eq("org_id", org)
      .order("created_at", { ascending: false })
      .limit(20);
    if (evalError) {
      setError(evalError.message ?? "Unable to load evaluation runs.");
      return;
    }
    const rows = (data as EvalRunRow[]) ?? [];
    setEvalRuns(rows);
    if (rows.length > 0 && !selectedRunId) {
      setSelectedRunId(rows[0].id);
    }
  }, [supabase, orgId, selectedRunId]);

  const refreshValuationRuns = useCallback(async (org: string | null = orgId) => {
    if (!org) return;
    const { data, error: valuationError } = await supabase
      .from("valuation_runs")
      .select("id, deal_id, created_at, output, provenance")
      .eq("org_id", org)
      .order("created_at", { ascending: false })
      .limit(10);
    if (valuationError) {
      setError(valuationError.message ?? "Unable to load valuation runs.");
      return;
    }
    const rows = (data as ValuationRunRow[]) ?? [];
    setValuationRuns(rows);
    if (rows.length > 0 && !selectedValuationRunId) {
      setSelectedValuationRunId(rows[0].id);
    }
  }, [supabase, orgId, selectedValuationRunId]);

  const refreshOverrides = useCallback(async (org: string | null = orgId, dealId: string | null | undefined = null) => {
    if (!org || !dealId) return;
    const { data, error: overrideError } = await supabase
      .from("valuation_comp_overrides")
      .select("org_id, deal_id, comp_id, comp_kind, seller_credit_pct, seller_credit_usd, condition_adjustment_usd, notes")
      .eq("org_id", org)
      .eq("deal_id", dealId)
      .order("comp_kind", { ascending: true })
      .order("comp_id", { ascending: true });
    if (overrideError) {
      setError(overrideError.message ?? "Unable to load comp overrides.");
      return;
    }
    const rows = (data as CompOverrideRow[]) ?? [];
    const map: Record<string, CompOverrideRow> = {};
    const inputs: Record<string, OverrideInputs> = {};
    rows.forEach((row) => {
      const key = `${row.comp_id}::${row.comp_kind}`;
      map[key] = row;
      inputs[key] = {
        seller_credit_pct: row.seller_credit_pct != null ? `${row.seller_credit_pct}` : "",
        seller_credit_usd: row.seller_credit_usd != null ? `${row.seller_credit_usd}` : "",
        condition_adjustment_usd: row.condition_adjustment_usd != null ? `${row.condition_adjustment_usd}` : "",
        notes: row.notes ?? "",
      };
    });
    setOverrides(map);
    setOverrideInputs(inputs);
  }, [supabase, orgId]);

  const handleGenerateEvalRun = useCallback(async () => {
    if (!orgId) {
      setError("Org not resolved yet.");
      return;
    }
    setGeneratingEvalRun(true);
    setError(null);
    const dataset = (generateDatasetName || "ground_truth_v1").trim();
    const posture = postureOptions.find((p) => p === generatePosture) ?? "base";
    const limit = Number.isFinite(generateLimit) ? Math.max(1, Math.min(200, generateLimit)) : 50;
    const { data, error: fnError } = await supabase.functions.invoke("v1-valuation-eval-run", {
      body: {
        dataset_name: dataset,
        posture,
        limit,
        org_id: orgId,
        force: generateForce,
      },
    });
    if (fnError) {
      const rawBody =
        (fnError as any)?.context?.body ??
        (fnError as any)?.context?.response?.error ??
        (fnError as any)?.context?.response?.body;
      let parsedMessage: string | null = null;
      if (typeof rawBody === "string" && rawBody.trim().length > 0) {
        try {
          const parsed = JSON.parse(rawBody);
          parsedMessage = parsed?.message ?? parsed?.error ?? null;
        } catch {
          parsedMessage = rawBody;
        }
      } else if (rawBody && typeof rawBody === "object" && (rawBody as any)?.message) {
        parsedMessage = (rawBody as any).message;
      }
      setLastEvalInputHash(null);
      setLastEvalDeduped(false);
      setGeneratingEvalRun(false);
      setError(parsedMessage ?? fnError.message ?? "Unable to generate evaluation run.");
      return;
    }
    const returnedHash = (data as any)?.input_hash ?? null;
    const deduped = (data as any)?.deduped === true;
    setLastEvalInputHash(returnedHash);
    setLastEvalDeduped(deduped);
    await refreshEvalRuns(orgId);
    const newId = (data as any)?.eval_run_id ?? null;
    if (newId) {
      setSelectedRunId(newId);
    }
    setGeneratingEvalRun(false);
  }, [generateDatasetName, generatePosture, generateLimit, generateForce, orgId, refreshEvalRuns, setError, supabase]);

  const handlePrefillCalibrationFromRun = useCallback(() => {
    setCalibrationError(null);
    if (!selectedValuationRun) {
      setCalibrationError("Select a valuation run to prefill estimates.");
      return;
    }
    const output = selectedValuationRun.output ?? {};
    const compEstimate = output.ensemble_comp_estimate ?? output.suggested_arv ?? null;
    const avmEstimate = output.ensemble_avm_estimate ?? output.avm_reference_price ?? null;

    setCalibrationForm((prev) => ({
      ...prev,
      dealId: selectedValuationRun.deal_id ?? prev.dealId,
      compEstimate: Number.isFinite(Number(compEstimate)) ? String(Math.round(Number(compEstimate))) : prev.compEstimate,
      avmEstimate: Number.isFinite(Number(avmEstimate)) ? String(Math.round(Number(avmEstimate))) : prev.avmEstimate,
    }));
  }, [selectedValuationRun]);

  const handleRunContinuousCalibration = useCallback(async () => {
    setCalibrationError(null);
    setCalibrationResult(null);
    setCalibrationEvidenceId(null);

    if (!orgId) {
      setCalibrationError("Org not resolved yet.");
      return;
    }

    const dealId = calibrationForm.dealId.trim();
    if (!dealId) {
      setCalibrationError("Deal ID is required.");
      return;
    }

    const actual = Number(calibrationForm.actual);
    if (!Number.isFinite(actual) || actual <= 0) {
      setCalibrationError("Ground truth actual must be a positive number.");
      return;
    }

    const compEstimate = Number(calibrationForm.compEstimate);
    const avmEstimate = Number(calibrationForm.avmEstimate);
    if (!Number.isFinite(compEstimate) || !Number.isFinite(avmEstimate)) {
      setCalibrationError("Enter numeric comps + AVM estimates.");
      return;
    }

    let observedAt: string | undefined;
    if (calibrationForm.observedAt) {
      const parsed = new Date(calibrationForm.observedAt);
      if (Number.isNaN(parsed.getTime())) {
        setCalibrationError("Observed date must be a valid date.");
        return;
      }
      observedAt = parsed.toISOString();
    }

    const note = calibrationForm.note.trim();

    setCalibrationLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("v1-valuation-continuous-calibrate", {
        body: {
          org_id: orgId,
          deal_id: dealId,
          ground_truth: {
            actual,
            observed_at: observedAt,
          },
          strategies: [
            { strategy: "comps_v1", estimate: compEstimate },
            { strategy: "avm", estimate: avmEstimate },
          ],
          note: note.length > 0 ? note : undefined,
        },
      });

      if (fnError) {
        const rawBody =
          (fnError as any)?.context?.body ??
          (fnError as any)?.context?.response?.error ??
          (fnError as any)?.context?.response?.body;
        let parsedMessage: string | null = null;
        if (typeof rawBody === "string" && rawBody.trim().length > 0) {
          try {
            const parsed = JSON.parse(rawBody);
            parsedMessage = parsed?.message ?? parsed?.error ?? null;
          } catch {
            parsedMessage = rawBody;
          }
        } else if (rawBody && typeof rawBody === "object" && (rawBody as any)?.message) {
          parsedMessage = (rawBody as any).message;
        }
        setCalibrationError(parsedMessage ?? fnError.message ?? "Calibration call failed.");
        return;
      }

      if (!(data as any)?.ok) {
        setCalibrationError((data as any)?.error ?? "Calibration failed.");
        return;
      }

      setCalibrationResult(data);

      const evidencePayload = {
        request: {
          org_id: orgId,
          deal_id: dealId,
          observed_at: observedAt ?? null,
          ground_truth_actual: actual,
          strategies: [
            { strategy: "comps_v1", estimate: compEstimate },
            { strategy: "avm", estimate: avmEstimate },
          ],
          note: note.length > 0 ? note : null,
        },
        response: data,
      };

      const fileName = `valuation-calibration-${dealId}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      const file = new File([JSON.stringify(evidencePayload, null, 2)], fileName, {
        type: "application/json",
      });

      const evidence = await uploadEvidence({
        dealId,
        runId: selectedValuationRun?.id ?? null,
        kind: "valuation_continuous_calibration",
        file,
      });
      setCalibrationEvidenceId(evidence.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Calibration failed.";
      setCalibrationError(message);
    } finally {
      setCalibrationLoading(false);
    }
  }, [calibrationForm, orgId, selectedValuationRun, supabase]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const org = await resolveOrgId(supabase);
        setOrgId(org);
        const r = await getActiveOrgMembershipRole(supabase, org);
        setRole(r);
        await Promise.all([refreshGroundTruth(org), refreshEvalRuns(org), refreshValuationRuns(org)]);
      } catch (err: any) {
        setError(err?.message ?? "Unable to load valuation QA data.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [supabase, refreshEvalRuns, refreshGroundTruth, refreshValuationRuns]);

  const selectedRun = useMemo(() => {
    if (!evalRuns.length) return null;
    if (selectedRunId) {
      return evalRuns.find((r) => r.id === selectedRunId) ?? evalRuns[0];
    }
    return evalRuns[0];
  }, [evalRuns, selectedRunId]);

  const inRangeRateDisplay = useMemo(() => {
    if (!selectedRun?.metrics) return "-";
    const rate = selectedRun.metrics.in_range_rate_overall;
    if (rate == null) return "-";
    const source = selectedRun.metrics.range_source_overall;
    const label = source === "uncertainty" ? "uncertainty" : source === "selection" ? "selection" : null;
    return `${percent.format(rate)}${label ? ` (${label})` : ""}`;
  }, [selectedRun]);

  const selectedValuationRun = useMemo(() => {
    if (!valuationRuns.length) return null;
    if (selectedValuationRunId) {
      return valuationRuns.find((r) => r.id === selectedValuationRunId) ?? valuationRuns[0];
    }
    return valuationRuns[0];
  }, [valuationRuns, selectedValuationRunId]);

  useEffect(() => {
    if (selectedValuationRun?.deal_id && orgId) {
      void refreshOverrides(orgId, selectedValuationRun.deal_id);
    }
  }, [orgId, selectedValuationRun?.deal_id, refreshOverrides]);

  const overrideKey = (compId: string | null | undefined, compKind: string | null | undefined) =>
    compId && compKind ? `${compId}::${compKind}` : "";

  const handleOverrideInputChange = (key: string, field: keyof OverrideInputs, value: string) => {
    setOverrideInputs((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const handleSaveOverride = async (comp: Comp) => {
    if (!orgId || !selectedValuationRun?.deal_id) return;
    const key = overrideKey(comp.id, (comp as any)?.comp_kind);
    const input = overrideInputs[key] ?? {};
    const notes = (input.notes ?? "").trim();
    if (!notes) {
      setError("Notes are required to save an override.");
      return;
    }
    const compKind = (comp as any)?.comp_kind;
    if (!comp.id || !compKind) {
      setError("Comp id/kind missing; cannot save override.");
      return;
    }
    const pctVal =
      input.seller_credit_pct === "" || input.seller_credit_pct == null ? null : Number(input.seller_credit_pct);
    const usdVal =
      input.seller_credit_usd === "" || input.seller_credit_usd == null ? null : Number(input.seller_credit_usd);
    const condVal =
      input.condition_adjustment_usd === "" || input.condition_adjustment_usd == null ? null : Number(input.condition_adjustment_usd);
    if (
      (pctVal != null && !Number.isFinite(pctVal)) ||
      (usdVal != null && !Number.isFinite(usdVal)) ||
      (condVal != null && !Number.isFinite(condVal))
    ) {
      setError("Override values must be numeric.");
      return;
    }
    const payload = {
      org_id: orgId,
      deal_id: selectedValuationRun.deal_id,
      comp_id: comp.id,
      comp_kind: compKind,
      seller_credit_pct: pctVal,
      seller_credit_usd: usdVal,
      condition_adjustment_usd: condVal,
      notes,
    };
    const { error: upsertError } = await supabase
      .from("valuation_comp_overrides")
      .upsert(payload, { onConflict: "org_id,deal_id,comp_id,comp_kind" });
    if (upsertError) {
      setError(upsertError.message ?? "Unable to save override.");
      return;
    }
    await refreshOverrides(orgId, selectedValuationRun.deal_id);
    router.refresh();
  };

  const handleDeleteOverride = async (comp: Comp) => {
    if (!orgId || !selectedValuationRun?.deal_id) return;
    const compId = comp.id;
    const compKind = (comp as any)?.comp_kind;
    if (!compId || !compKind) return;
    const { error: deleteError } = await supabase
      .from("valuation_comp_overrides")
      .delete()
      .eq("org_id", orgId)
      .eq("deal_id", selectedValuationRun.deal_id)
      .eq("comp_id", compId)
      .eq("comp_kind", compKind);
    if (deleteError) {
      setError(deleteError.message ?? "Unable to delete override.");
      return;
    }
    await refreshOverrides(orgId, selectedValuationRun.deal_id);
    router.refresh();
  };

  const handleEnsembleSweep = useCallback(async () => {
    if (!selectedRun || !orgId) {
      setSweepError("Select an eval run first.");
      return;
    }
    setSweepLoading(true);
    setSweepError(null);
    setSweepResults(null);
    setSweepBestMae(null);
    setSweepBestMape(null);
    setSweepDiagnostics(null);
    const stepVal = Number.isFinite(sweepStep) ? sweepStep : 0.05;
    const { data, error: fnError } = await supabase.functions.invoke("v1-valuation-ensemble-sweep", {
      body: {
        eval_run_id: selectedRun.id,
        org_id: orgId,
        step: stepVal,
        apply_cap: sweepApplyCap,
      },
    });
    if (fnError) {
      const rawBody =
        (fnError as any)?.context?.body ??
        (fnError as any)?.context?.response?.error ??
        (fnError as any)?.context?.response?.body;
      let parsedMessage: string | null = null;
      if (typeof rawBody === "string" && rawBody.trim().length > 0) {
        try {
          const parsed = JSON.parse(rawBody);
          parsedMessage = parsed?.message ?? parsed?.error ?? null;
        } catch {
          parsedMessage = rawBody;
        }
      } else if (rawBody && typeof rawBody === "object" && (rawBody as any)?.message) {
        parsedMessage = (rawBody as any).message;
      }
      setSweepLoading(false);
      setSweepError(parsedMessage ?? fnError.message ?? "Ensemble sweep failed.");
      return;
    }
    setSweepResults((data as any)?.results ?? null);
    setSweepBestMae((data as any)?.best_by_mae ?? null);
    setSweepBestMape((data as any)?.best_by_mape ?? null);
    setSweepDiagnostics((data as any)?.diagnostics ?? null);
    setSweepLoading(false);
  }, [selectedRun, orgId, sweepStep, sweepApplyCap, supabase]);

  async function handleSaveGroundTruth(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) {
      setError("Admin-only: you do not have permission to edit ground truth.");
      return;
    }
    if (!orgId) return;
    const price = Number(form.realizedPrice);
    if (!Number.isFinite(price)) {
      setError("Enter a numeric realized price.");
      return;
    }
    const subjectKey = form.dealId ? `deal:${form.dealId}` : `subject:${form.source}`;
    setSavingForm(true);
    setError(null);
    const payload = {
      org_id: orgId,
      deal_id: form.dealId ? form.dealId : null,
      subject_key: subjectKey,
      source: form.source || "sale_price",
      realized_price: price,
      realized_date: form.realizedDate || null,
      notes: form.notes || null,
    };
    const { error: upsertError } = await supabase
      .from("valuation_ground_truth")
      .upsert(payload, { onConflict: "org_id,subject_key,source,realized_date" });
    setSavingForm(false);
    if (upsertError) {
      setError(upsertError.message ?? "Unable to save ground truth.");
      return;
    }
    await refreshGroundTruth(orgId);
    setForm((prev) => ({ ...prev, realizedPrice: "", realizedDate: "", notes: "" }));
  }

  if (loading) {
    return (
      <main className="p-6 space-y-4">
        <h1 className="text-xl font-semibold">Valuation QA</h1>
        <div className="text-sm text-text-secondary/80">Loading...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6 space-y-4">
        <h1 className="text-xl font-semibold">Valuation QA</h1>
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="p-6 space-y-4">
        <h1 className="text-xl font-semibold">Valuation QA</h1>
        <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-100">
          Admin-only: managers/VP/owners only.
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-secondary/80">Org-scoped, admin-only</p>
          <h1 className="text-2xl font-semibold text-text-primary">Valuation QA</h1>
        </div>
        <Badge color="blue">Org: {orgId?.slice(0, 8)}…</Badge>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Ground Truth</h2>
            <Button size="sm" variant="neutral" onClick={() => void refreshGroundTruth()}>
              Refresh
            </Button>
          </div>
          <form className="space-y-3" onSubmit={handleSaveGroundTruth}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <InputField
                label="Deal ID"
                value={form.dealId}
                onChange={(e) => setForm((prev) => ({ ...prev, dealId: e.target.value }))}
                placeholder="uuid"
              />
              <InputField
                label="Source"
                value={form.source}
                onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}
                placeholder="sale_price / appraisal"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <InputField
                label="Realized Price"
                type="number"
                value={form.realizedPrice}
                onChange={(e) => setForm((prev) => ({ ...prev, realizedPrice: e.target.value }))}
              />
              <InputField
                label="Realized Date"
                type="date"
                value={form.realizedDate}
                onChange={(e) => setForm((prev) => ({ ...prev, realizedDate: e.target.value }))}
              />
            </div>
            <InputField
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional notes"
            />
            <div className="flex items-center justify-end">
              <Button type="submit" disabled={savingForm}>
                {savingForm ? "Saving..." : "Save / Upsert"}
              </Button>
            </div>
          </form>

          <div className="mt-5">
            <h3 className="text-sm font-semibold text-text-secondary/80 mb-2">Recent ground truth</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-text-secondary/70">
                    <th className="px-2 py-1">Deal</th>
                    <th className="px-2 py-1">Source</th>
                    <th className="px-2 py-1">Price</th>
                    <th className="px-2 py-1">Date</th>
                    <th className="px-2 py-1">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {groundTruthRows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-2 py-1 text-text-primary">
                        {row.deal_id ? (
                          <Link href={`/underwrite?dealId=${row.deal_id}`} className="text-accent-blue hover:underline">
                            {row.deal_id.slice(0, 8)}…
                          </Link>
                        ) : (
                          <span className="text-text-secondary/70">{row.subject_key}</span>
                        )}
                      </td>
                      <td className="px-2 py-1 text-text-secondary/80">{row.source}</td>
                      <td className="px-2 py-1 text-text-primary">{currency.format(Number(row.realized_price))}</td>
                      <td className="px-2 py-1 text-text-secondary/70">{row.realized_date ?? "—"}</td>
                      <td className="px-2 py-1 text-text-secondary/70">{row.notes ?? "—"}</td>
                    </tr>
                  ))}
                  {groundTruthRows.length === 0 && (
                    <tr>
                      <td className="px-2 py-3 text-text-secondary/70" colSpan={5}>
                        No ground truth rows yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Continuous Calibration</h2>
              <p className="text-xs text-text-secondary/70">Manual admin trigger (does not change live valuation outputs).</p>
            </div>
            <Button
              size="sm"
              variant="neutral"
              onClick={handlePrefillCalibrationFromRun}
              disabled={!selectedValuationRun}
            >
              Use selected run
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <InputField
              label="Deal ID"
              value={calibrationForm.dealId}
              onChange={(e) => setCalibrationForm((prev) => ({ ...prev, dealId: e.target.value }))}
              placeholder="uuid"
            />
            <InputField
              label="Ground truth actual"
              type="number"
              value={calibrationForm.actual}
              onChange={(e) => setCalibrationForm((prev) => ({ ...prev, actual: e.target.value }))}
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <InputField
              label="Observed date"
              type="date"
              value={calibrationForm.observedAt}
              onChange={(e) => setCalibrationForm((prev) => ({ ...prev, observedAt: e.target.value }))}
            />
            <InputField
              label="Note"
              value={calibrationForm.note}
              onChange={(e) => setCalibrationForm((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="Optional note"
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <InputField
              label="Comps estimate"
              type="number"
              value={calibrationForm.compEstimate}
              onChange={(e) => setCalibrationForm((prev) => ({ ...prev, compEstimate: e.target.value }))}
            />
            <InputField
              label="AVM estimate"
              type="number"
              value={calibrationForm.avmEstimate}
              onChange={(e) => setCalibrationForm((prev) => ({ ...prev, avmEstimate: e.target.value }))}
            />
          </div>

          {selectedValuationRun?.deal_id ? (
            <div className="mt-3 text-xs text-text-secondary/70">
              Selected run: <span className="text-text-primary">{selectedValuationRun.deal_id.slice(0, 8)}.</span>
              {selectedValuationRun.id ? (
                <span className="ml-2">run {selectedValuationRun.id.slice(0, 8)}.</span>
              ) : null}
            </div>
          ) : null}

          {calibrationError ? (
            <div className="mt-3 text-xs text-red-300">{calibrationError}</div>
          ) : null}

          {calibrationResult ? (
            <div className="mt-3 rounded-md border border-white/10 bg-white/5 p-3 text-xs text-text-secondary/80">
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  Published:{" "}
                  <span className="text-text-primary">
                    {(calibrationResult as any)?.published ? "yes" : "no"}
                  </span>
                </span>
                {(calibrationResult as any)?.version ? (
                  <span>
                    Version: <span className="text-text-primary">{(calibrationResult as any).version}</span>
                  </span>
                ) : null}
                {(calibrationResult as any)?.bucket ? (
                  <span>
                    Bucket:{" "}
                    <span className="text-text-primary">
                      {(calibrationResult as any).bucket.market_key}/{(calibrationResult as any).bucket.home_band}
                    </span>
                  </span>
                ) : null}
                {calibrationEvidenceId ? (
                  <span>
                    Evidence: <span className="text-text-primary">{calibrationEvidenceId.slice(0, 8)}.</span>
                  </span>
                ) : null}
              </div>
              <pre className="mt-2 whitespace-pre-wrap text-[11px] text-text-secondary/70">
                {JSON.stringify(
                  {
                    scores: (calibrationResult as any)?.scores,
                    weights: (calibrationResult as any)?.weights,
                    reason: (calibrationResult as any)?.reason,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-end">
            <Button onClick={() => void handleRunContinuousCalibration()} disabled={calibrationLoading}>
              {calibrationLoading ? "Calibrating..." : "Run calibration"}
            </Button>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Evaluation Runs</h2>
            <Button size="sm" variant="neutral" onClick={() => void refreshEvalRuns()}>
              Refresh
            </Button>
          </div>
          <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-4">
            <InputField
              label="Dataset name"
              value={generateDatasetName}
              onChange={(e) => setGenerateDatasetName(e.target.value)}
            />
            <div className="flex flex-col gap-1 text-sm text-text-secondary/80">
              <label className="text-xs font-semibold text-text-secondary/80">Posture</label>
              <select
                value={generatePosture}
                onChange={(e) => setGeneratePosture(e.target.value as (typeof postureOptions)[number])}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none focus:border-[color:var(--accent-color)]"
              >
                {postureOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          <InputField
            label="Limit"
            type="number"
            value={generateLimit}
            onChange={(e) => {
              const next = Number(e.target.value);
              setGenerateLimit(Number.isFinite(next) ? next : 0);
            }}
          />
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 text-xs text-text-secondary/80">
              <input
                type="checkbox"
                checked={generateForce}
                onChange={(e) => setGenerateForce(e.target.checked)}
                className="h-4 w-4 accent-[color:var(--accent-color)]"
              />
              Bypass rate limit
            </label>
            <Button
              size="sm"
              onClick={() => void handleGenerateEvalRun()}
              disabled={generatingEvalRun}
            >
              {generatingEvalRun ? "Generating..." : "Generate eval run"}
            </Button>
          </div>
        </div>
        {(lastEvalInputHash || lastEvalDeduped) && (
          <div className="mb-3 flex flex-wrap gap-3 text-xs text-text-secondary/80">
            {lastEvalInputHash ? (
              <span>
                input_hash:{" "}
                <span className="text-text-primary">
                  {lastEvalInputHash.length > 12
                    ? `${lastEvalInputHash.slice(0, 12)}…`
                    : lastEvalInputHash}
                </span>
              </span>
            ) : null}
            {lastEvalDeduped ? <span className="text-accent-blue">Deduped: existing eval run reused.</span> : null}
          </div>
        )}
          {evalRuns.length === 0 ? (
            <div className="text-sm text-text-secondary/70">No evaluation runs yet.</div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {evalRuns.map((run) => (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => setSelectedRunId(run.id)}
                    className={[
                      "rounded-md border px-3 py-1 text-xs transition-colors",
                      selectedRun?.id === run.id
                        ? "border-[color:var(--accent-color)] bg-[color:var(--accent-color)]/10 text-text-primary"
                        : "border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] text-text-secondary/80 hover:border-[color:var(--accent-color)]",
                    ].join(" ")}
                  >
                    {run.dataset_name} - {run.created_at?.slice(0, 10)}
                  </button>
                ))}
              </div>

              {selectedRun ? (
                <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm text-text-secondary/80">
                <div>Dataset: <span className="text-text-primary">{selectedRun.dataset_name}</span></div>
                <div>Created: <span className="text-text-primary">{selectedRun.created_at?.slice(0, 19) ?? "-"}</span></div>
                <div>Posture: <span className="text-text-primary">{selectedRun.posture ?? "-"}</span></div>
                <div>MAE: <span className="text-text-primary">{selectedRun.metrics?.mae ? currency.format(selectedRun.metrics.mae) : "-"}</span></div>
                <div>MAPE: <span className="text-text-primary">{selectedRun.metrics?.mape ? percent.format(selectedRun.metrics.mape) : "-"}</span></div>
                <div>In-range rate: <span className="text-text-primary">{inRangeRateDisplay}</span></div>
                <div>Cases: <span className="text-text-primary">{selectedRun.metrics?.count_with_ground_truth ?? 0} / {selectedRun.metrics?.count_total ?? 0}</span></div>
                <div>input_hash: <span className="text-text-primary">{(selectedRun as any)?.params?.input_hash ?? "-"}</span></div>
              </div>

              <div className="rounded-md border border-white/10 bg-white/5 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 text-sm font-semibold text-text-primary">
                  <span>Ensemble sweep</span>
                  {sweepLoading ? <Badge color="blue">Running...</Badge> : null}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm text-text-secondary/80">
                  <InputField
                    label="Step"
                    type="number"
                    value={sweepStep}
                    onChange={(e) => setSweepStep(Number(e.target.value))}
                    placeholder="0.05"
                  />
                  <label className="flex items-center gap-2 text-xs text-text-secondary/80">
                    <input
                      type="checkbox"
                      checked={sweepApplyCap}
                      onChange={(e) => setSweepApplyCap(e.target.checked)}
                      className="h-4 w-4 accent-[color:var(--accent-color)]"
                    />
                    Apply cap
                  </label>
                  <div className="flex items-end">
                    <Button size="sm" onClick={() => void handleEnsembleSweep()} disabled={sweepLoading}>
                      {sweepLoading ? "Running..." : "Run sweep"}
                    </Button>
                  </div>
                </div>
                {sweepError ? (
                  <div className="text-xs text-red-300">{sweepError}</div>
                ) : null}
                {sweepResults && Array.isArray(sweepResults) && sweepResults.length > 0 ? (
                  <div className="space-y-2">
                    {sweepDiagnostics ? (
                      <div className="text-xs text-text-secondary/70">
                        Scored {sweepDiagnostics.cases_scored ?? 0} / {sweepDiagnostics.cases_total ?? 0}
                        {` (missing compEst ${sweepDiagnostics.cases_missing_comp_estimate ?? 0}, `}
                        {`missing realized ${sweepDiagnostics.cases_missing_realized ?? 0}, `}
                        {`missing run_id ${sweepDiagnostics.cases_missing_run_id ?? 0}, `}
                        {`missing run_row ${sweepDiagnostics.cases_missing_run_row ?? 0})`}
                      </div>
                    ) : null}
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="text-left text-text-secondary/70">
                            <th className="px-2 py-1">AVM weight</th>
                            <th className="px-2 py-1">MAE</th>
                            <th className="px-2 py-1">MAPE</th>
                            <th className="px-2 py-1">Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {sweepResults.map((row: any) => {
                            const bestMaeWeight = (sweepBestMae as any)?.avm_weight;
                            const bestMapeWeight = (sweepBestMape as any)?.avm_weight;
                            const highlight = row.avm_weight === bestMaeWeight || row.avm_weight === bestMapeWeight;
                            return (
                              <tr key={row.avm_weight} className={highlight ? "bg-[color:var(--accent-color)]/10" : ""}>
                                <td className="px-2 py-1 text-text-primary">{row.avm_weight}</td>
                                <td className="px-2 py-1 text-text-secondary/80">
                                  {row.mae != null ? currency.format(row.mae) : "-"}
                                </td>
                                <td className="px-2 py-1 text-text-secondary/80">
                                  {row.mape != null ? percent.format(row.mape) : "-"}
                                </td>
                                <td className="px-2 py-1 text-text-secondary/80">{row.count ?? 0}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-text-secondary/80 mb-2">Calibration by confidence</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-text-secondary/70">
                            <th className="px-2 py-1">Grade</th>
                            <th className="px-2 py-1">Count</th>
                            <th className="px-2 py-1">MAE</th>
                            <th className="px-2 py-1">In-range</th>
                            <th className="px-2 py-1">Mean range pct</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {selectedRun.metrics?.by_confidence
                            ? Object.entries(selectedRun.metrics.by_confidence).map(([grade, data]: [string, any]) => (
                                <tr key={grade}>
                                  <td className="px-2 py-1 text-text-primary">{grade}</td>
                                  <td className="px-2 py-1 text-text-secondary/80">{data?.count ?? 0}</td>
                                  <td className="px-2 py-1 text-text-secondary/80">
                                    {data?.mae != null ? currency.format(data.mae) : "—"}
                                  </td>
                                  <td className="px-2 py-1 text-text-secondary/80">
                                    {data?.in_range_rate != null ? percent.format(data.in_range_rate) : "—"}
                                  </td>
                                  <td className="px-2 py-1 text-text-secondary/80">
                                    {data?.mean_range_pct != null ? percent.format(data.mean_range_pct) : "—"}
                                  </td>
                                </tr>
                              ))
                            : (
                              <tr>
                                <td className="px-2 py-3 text-text-secondary/70" colSpan={5}>No confidence breakdown.</td>
                              </tr>
                            )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-text-secondary/80 mb-2">Cases</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-text-secondary/70">
                            <th className="px-2 py-1">Deal</th>
                            <th className="px-2 py-1">Predicted</th>
                            <th className="px-2 py-1">Realized</th>
                            <th className="px-2 py-1">Abs Error</th>
                            <th className="px-2 py-1">Pct Error</th>
                            <th className="px-2 py-1">Conf</th>
                            <th className="px-2 py-1">Comp Kind</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {(selectedRun.metrics?.cases ?? []).map((c: any) => (
                            <tr key={`${c.deal_id}-${c.valuation_run_id ?? ""}`}>
                              <td className="px-2 py-1 text-text-primary">
                                {c.deal_id ? (
                                  <Link href={`/underwrite?dealId=${c.deal_id}`} className="text-accent-blue hover:underline">
                                    {c.deal_id.slice(0, 8)}…
                                  </Link>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="px-2 py-1 text-text-secondary/80">
                                {c.predicted_arv != null ? currency.format(c.predicted_arv) : "—"}
                              </td>
                              <td className="px-2 py-1 text-text-secondary/80">
                                {c.realized_price != null ? currency.format(c.realized_price) : "—"}
                              </td>
                              <td className="px-2 py-1 text-text-primary">
                                {c.abs_error != null ? currency.format(c.abs_error) : "—"}
                              </td>
                              <td className="px-2 py-1 text-text-primary">
                                {c.pct_error != null ? percent.format(c.pct_error) : "—"}
                              </td>
                              <td className="px-2 py-1 text-text-secondary/80">{c.confidence_grade ?? "—"}</td>
                              <td className="px-2 py-1 text-text-secondary/80">{c.comp_kind_used ?? "—"}</td>
                            </tr>
                          ))}
                          {(selectedRun.metrics?.cases ?? []).length === 0 && (
                            <tr>
                              <td className="px-2 py-3 text-text-secondary/70" colSpan={7}>
                                No cases recorded in this run.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Recent valuation runs (ledger)</h2>
          <Button size="sm" variant="neutral" onClick={() => void refreshValuationRuns()}>
            Refresh
          </Button>
        </div>
        {valuationRuns.length === 0 ? (
          <div className="text-sm text-text-secondary/70">No valuation runs loaded.</div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {valuationRuns.map((run) => (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => {
                    setSelectedValuationRunId(run.id);
                    void refreshOverrides(orgId, run.deal_id ?? null);
                  }}
                  className={[
                    "rounded-md border px-3 py-1 text-xs transition-colors",
                    selectedValuationRun?.id === run.id
                      ? "border-[color:var(--accent-color)] bg-[color:var(--accent-color)]/10 text-text-primary"
                      : "border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] text-text-secondary/80 hover:border-[color:var(--accent-color)]",
                  ].join(" ")}
                >
                  {run.deal_id ? `${run.deal_id.slice(0, 8)}.` : "unknown"}{" "}
                  {run.created_at?.slice(0, 10) ?? "-"}
                </button>
              ))}
            </div>

            {selectedValuationRun ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-text-secondary/80">
                  <div>
                    Run ID: <span className="text-text-primary">{selectedValuationRun.id}</span>
                  </div>
                  <div>
                    Deal:{" "}
                    {selectedValuationRun.deal_id ? (
                      <Link
                        href={`/underwrite?dealId=${selectedValuationRun.deal_id}`}
                        className="text-accent-blue hover:underline"
                      >
                        {selectedValuationRun.deal_id.slice(0, 8)}.
                      </Link>
                    ) : (
                      <span className="text-text-secondary/70">-</span>
                    )}
                  </div>
                  <div>
                    Basis:{" "}
                    <span className="text-text-primary">
                      {selectedValuationRun.output?.suggested_arv_basis ?? "default"}
                    </span>
                  </div>
                  <div>
                    Adjustments version:{" "}
                    <span className="text-text-primary">
                      {selectedValuationRun.output?.adjustments_version ?? "-"}
                    </span>
                  </div>
                  <div>
                    Suggested ARV:{" "}
                    <span className="text-text-primary">
                      {selectedValuationRun.output?.suggested_arv != null
                        ? currency.format(Number(selectedValuationRun.output.suggested_arv))
                        : "-"}
                    </span>
                  </div>
                </div>

                <div className="rounded-md border border-white/10 bg-white/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-text-secondary/80">Selection diagnostics</h4>
                    <Badge color="blue">
                      {selectedValuationRun.output?.selection_version ?? "selection_v1_1"}
                    </Badge>
                  </div>
                  {selectedValuationRun.output?.selection_diagnostics ? (
                    <div className="space-y-2 text-xs text-text-secondary">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded border border-white/10 px-2 py-1">
                          Candidates {selectedValuationRun.output.selection_diagnostics.counts.after_filters} →{" "}
                          {selectedValuationRun.output.selection_diagnostics.counts.after_outlier_checks}
                        </span>
                        <span className="rounded border border-white/10 px-2 py-1">
                          Selected {selectedValuationRun.output.selection_diagnostics.counts.selected}
                        </span>
                        <span className="rounded border border-white/10 px-2 py-1">
                          Outliers removed {selectedValuationRun.output.selection_diagnostics.outliers.removed_ids.length}
                        </span>
                      </div>
                      {(selectedValuationRun.output.selection_diagnostics.filters.relaxations?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedValuationRun.output.selection_diagnostics.filters.relaxations?.map((relax: string) => (
                            <span
                              key={relax}
                              className="rounded border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-amber-100"
                            >
                              Relaxation: {relax}
                            </span>
                          ))}
                        </div>
                      )}
                      {(selectedValuationRun.output.selection_diagnostics.warnings?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedValuationRun.output.selection_diagnostics.warnings?.map((w: string) => (
                            <span
                              key={w}
                              className="rounded border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-amber-100"
                            >
                              Warning: {w}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="rounded border border-white/10 bg-white/5 p-2 font-mono text-[11px] leading-5 text-text-secondary">
                        {JSON.stringify(selectedValuationRun.output.selection_diagnostics, null, 2)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-text-secondary/70">No selection diagnostics available for this run.</div>
                  )}
                </div>

                <div className="rounded-md border border-white/10 bg-white/5 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <span>Ensemble &amp; Uncertainty</span>
                    {selectedValuationRun.output?.ensemble_version || selectedValuationRun.output?.uncertainty_version ? (
                      <Badge color="blue">ENABLED</Badge>
                    ) : (
                      <Badge>OFF</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-text-secondary/80">
                    <div>
                      Basis:{" "}
                      <span className="text-text-primary">
                        {selectedValuationRun.output?.suggested_arv_basis ?? "default"}
                      </span>
                    </div>
                    <div>
                      Ensemble version:{" "}
                      <span className="text-text-primary">{selectedValuationRun.output?.ensemble_version ?? "-"}</span>
                    </div>
                    <div>
                      Comp est:{" "}
                      <span className="text-text-primary">
                        {selectedValuationRun.output?.ensemble_comp_estimate != null
                          ? currency.format(Number(selectedValuationRun.output.ensemble_comp_estimate))
                          : "-"}
                      </span>
                    </div>
                    <div>
                      AVM est:{" "}
                      <span className="text-text-primary">
                        {selectedValuationRun.output?.ensemble_avm_estimate != null
                          ? currency.format(Number(selectedValuationRun.output.ensemble_avm_estimate))
                          : "-"}
                      </span>
                    </div>
                    <div>
                      Weights:{" "}
                      <span className="text-text-primary">
                        {selectedValuationRun.output?.ensemble_weights
                          ? `comps ${(Number((selectedValuationRun.output as any).ensemble_weights?.comps ?? 0) * 100).toFixed(1)}% / avm ${(Number((selectedValuationRun.output as any).ensemble_weights?.avm ?? 0) * 100).toFixed(1)}%`
                          : "-"}
                      </span>
                    </div>
                    <div>
                      Ceiling:{" "}
                      <span className="text-text-primary">
                        {selectedValuationRun.output?.ensemble_cap_value != null
                          ? `${currency.format(Number(selectedValuationRun.output.ensemble_cap_value))} ${selectedValuationRun.output?.ensemble_cap_applied ? "(applied)" : "(not applied)"}`
                          : "-"}
                      </span>
                    </div>
                    <div>
                      Uncertainty:{" "}
                      <span className="text-text-primary">
                        {selectedValuationRun.output?.uncertainty_range_low != null &&
                        selectedValuationRun.output?.uncertainty_range_high != null
                          ? `${currency.format(Number(selectedValuationRun.output.uncertainty_range_low))} – ${currency.format(Number(selectedValuationRun.output.uncertainty_range_high))}`
                          : "-"}
                        {selectedValuationRun.output?.uncertainty_range_pct != null
                          ? ` (${(Number(selectedValuationRun.output.uncertainty_range_pct) * 100).toFixed(1)}%)`
                          : ""}
                      </span>
                    </div>
                    <div>
                      Uncertainty method:{" "}
                      <span className="text-text-primary">
                        {selectedValuationRun.output?.uncertainty_method ?? "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-white/10 bg-white/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-text-secondary/80">Comp Overrides</h4>
                    <Button size="sm" variant="neutral" onClick={() => void refreshOverrides(orgId, selectedValuationRun.deal_id)}>
                      Refresh overrides
                    </Button>
                  </div>
                  {Array.isArray(selectedValuationRun.output?.selected_comps) && selectedValuationRun.output.selected_comps.length > 0 ? (
                    selectedValuationRun.output.selected_comps.map((comp: any) => {
                      const key = overrideKey(comp.id, comp.comp_kind);
                      const current = overrides[key];
                      const inputs = overrideInputs[key] ?? {};
                      return (
                        <div key={key || comp.id} className="rounded border border-white/10 bg-white/5 p-3 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-text-primary">
                              {comp.address ?? comp.id ?? "comp"} ({comp.comp_kind ?? "-"})
                            </div>
                            {current ? <Badge color="blue">Override exists</Badge> : <Badge>No override</Badge>}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                            <InputField
                              label="Seller credit %"
                              type="number"
                              step="0.01"
                              value={inputs.seller_credit_pct ?? ""}
                              onChange={(e) => handleOverrideInputChange(key, "seller_credit_pct", e.target.value)}
                              placeholder="e.g. 0.05"
                            />
                            <InputField
                              label="Seller credit $"
                              type="number"
                              value={inputs.seller_credit_usd ?? ""}
                              onChange={(e) => handleOverrideInputChange(key, "seller_credit_usd", e.target.value)}
                              placeholder="e.g. 5000"
                            />
                            <InputField
                              label="Condition adj $"
                              type="number"
                              value={inputs.condition_adjustment_usd ?? ""}
                              onChange={(e) => handleOverrideInputChange(key, "condition_adjustment_usd", e.target.value)}
                              placeholder="-5000"
                            />
                            <InputField
                              label="Notes (required)"
                              value={inputs.notes ?? ""}
                              onChange={(e) => handleOverrideInputChange(key, "notes", e.target.value)}
                              placeholder="Reason / source"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => void handleSaveOverride(comp as Comp)}>
                              Save override
                            </Button>
                            {current ? (
                              <Button size="sm" variant="danger" onClick={() => void handleDeleteOverride(comp as Comp)}>
                                Delete override
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-text-secondary/70">No selected comps to override.</div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-text-secondary/80 mb-2">Selected comps ledger</h4>
                  <div className="space-y-2">
                    {Array.isArray(selectedValuationRun.output?.selected_comps) &&
                    selectedValuationRun.output.selected_comps.length > 0 ? (
                      selectedValuationRun.output.selected_comps.map((comp: any) => (
                        <div key={comp.id} className="rounded-md border border-white/10 bg-white/5 p-3 space-y-1 text-sm">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-text-primary">
                              {comp.address ?? comp.id ?? "comp"} ({comp.comp_kind ?? "-"})
                            </div>
                            <div className="text-xs text-text-secondary">
                              Adjusted:{" "}
                              {comp.adjusted_value != null ? currency.format(Number(comp.adjusted_value)) : "-"}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-text-secondary">
                            <span>Raw: {comp.price != null ? currency.format(Number(comp.price)) : "-"}</span>
                            <span>
                              Time-adjusted:{" "}
                              {comp.time_adjusted_price != null ? currency.format(Number(comp.time_adjusted_price)) : "-"}
                            </span>
                            <span>
                              Basis:{" "}
                              {comp.value_basis_before_adjustments != null
                                ? currency.format(Number(comp.value_basis_before_adjustments))
                                : "-"}{" "}
                              ({comp.value_basis_method ?? "time"})
                            </span>
                          </div>
                          <div className="mt-1 space-y-1">
                            {Array.isArray(comp.adjustments) && comp.adjustments.length > 0 ? (
                              comp.adjustments.map((adj: any, idx: number) => (
                                <div
                                  key={`${adj.type}-${idx}`}
                                  className="flex flex-wrap items-center justify-between rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px]"
                                >
                                  <span className="font-semibold text-text-primary">{adj.type}</span>
                                  <span className={adj.applied ? "text-accent-green" : "text-accent-orange"}>
                                    {adj.applied ? "applied" : `skipped${adj.skip_reason ? `: ${adj.skip_reason}` : ""}`}
                                  </span>
                                  <span>
                                    Delta {adj.delta_units_capped ?? adj.delta_units_raw ?? "-"} @{" "}
                                    {adj.unit_value != null ? currency.format(Number(adj.unit_value)) : "-"}
                                  </span>
                                  <span>
                                    Amount:{" "}
                                    {adj.amount_capped != null
                                      ? currency.format(Number(adj.amount_capped))
                                      : adj.amount_raw != null
                                      ? currency.format(Number(adj.amount_raw))
                                      : "-"}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="text-[11px] text-text-secondary/70">No adjustments recorded.</div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-text-secondary/70">No selected comps on this run.</div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </GlassCard>
    </main>
  );
}
