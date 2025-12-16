"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Badge, Button, GlassCard, InputField } from "@/components/ui";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { resolveOrgId } from "@/lib/deals";
import { getActiveOrgMembershipRole, type OrgMembershipRole } from "@/lib/orgMembership";

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

type GroundTruthForm = {
  dealId: string;
  source: string;
  realizedPrice: string;
  realizedDate: string;
  notes: string;
};

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 2 });

export default function ValuationQaPage() {
  const supabase = getSupabaseClient();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [role, setRole] = useState<OrgMembershipRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [groundTruthRows, setGroundTruthRows] = useState<GroundTruthRow[]>([]);
  const [evalRuns, setEvalRuns] = useState<EvalRunRow[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [valuationRuns, setValuationRuns] = useState<any[]>([]);
  const [selectedValuationRunId, setSelectedValuationRunId] = useState<string | null>(null);

  const [form, setForm] = useState<GroundTruthForm>({
    dealId: "",
    source: "sale_price",
    realizedPrice: "",
    realizedDate: "",
    notes: "",
  });
  const [savingForm, setSavingForm] = useState(false);

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
    const rows = (data as any[]) ?? [];
    setValuationRuns(rows);
    if (rows.length > 0 && !selectedValuationRunId) {
      setSelectedValuationRunId(rows[0].id);
    }
  }, [supabase, orgId, selectedValuationRunId]);

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

  const selectedValuationRun = useMemo(() => {
    if (!valuationRuns.length) return null;
    if (selectedValuationRunId) {
      return valuationRuns.find((r) => r.id === selectedValuationRunId) ?? valuationRuns[0];
    }
    return valuationRuns[0];
  }, [valuationRuns, selectedValuationRunId]);

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
            <h2 className="text-lg font-semibold text-text-primary">Evaluation Runs</h2>
            <Button size="sm" variant="neutral" onClick={() => void refreshEvalRuns()}>
              Refresh
            </Button>
          </div>
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
                    {run.dataset_name} · {run.created_at?.slice(0, 10)}
                  </button>
                ))}
              </div>

              {selectedRun ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm text-text-secondary/80">
                    <div>Dataset: <span className="text-text-primary">{selectedRun.dataset_name}</span></div>
                    <div>Created: <span className="text-text-primary">{selectedRun.created_at?.slice(0, 19) ?? "—"}</span></div>
                    <div>Posture: <span className="text-text-primary">{selectedRun.posture ?? "—"}</span></div>
                    <div>MAE: <span className="text-text-primary">{selectedRun.metrics?.mae ? currency.format(selectedRun.metrics.mae) : "—"}</span></div>
                    <div>MAPE: <span className="text-text-primary">{selectedRun.metrics?.mape ? percent.format(selectedRun.metrics.mape) : "—"}</span></div>
                    <div>In-range rate: <span className="text-text-primary">{selectedRun.metrics?.in_range_rate_overall != null ? percent.format(selectedRun.metrics.in_range_rate_overall) : "—"}</span></div>
                    <div>Cases: <span className="text-text-primary">{selectedRun.metrics?.count_with_ground_truth ?? 0} / {selectedRun.metrics?.count_total ?? 0}</span></div>
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
                  onClick={() => setSelectedValuationRunId(run.id)}
                  className={[
                    "rounded-md border px-3 py-1 text-xs transition-colors",
                    selectedValuationRun?.id === run.id
                      ? "border-[color:var(--accent-color)] bg-[color:var(--accent-color)]/10 text-text-primary"
                      : "border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] text-text-secondary/80 hover:border-[color:var(--accent-color)]",
                  ].join(" ")}
                >
                  {run.deal_id ? `${run.deal_id.slice(0, 8)}.` : "unknown"} •{" "}
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
                    Adjustments:{" "}
                    <span className="text-text-primary">
                      {selectedValuationRun.output?.suggested_arv_basis
                        ? `ENABLED (${selectedValuationRun.output?.suggested_arv_basis}) v${selectedValuationRun.output?.adjustments_version ?? "-"}`
                        : "Disabled / default"}
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
                                    Δ {adj.delta_units_capped ?? adj.delta_units_raw ?? "-"} @{" "}
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
