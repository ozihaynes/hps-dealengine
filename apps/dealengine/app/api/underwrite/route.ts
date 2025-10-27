/* apps/dealengine/app/api/underwrite/route.ts */
import { NextResponse } from "next/server";
import { z } from "zod";
import { uiToEngine, type EngineDeal } from "../../../lib/contract-adapter";

const MoneyRow = z.object({ label: z.string().optional(), amount: z.number().finite() });

const EngineDealSchema = z.object({
  market: z.object({
    aiv: z.number().min(0),
    arv: z.number().min(0),
    dom_zip: z.number(),
    moi_zip: z.number(),
    "price-to-list-pct": z.number().min(0).max(1).optional(),
  }),
  costs: z.object({
    repairs_base: z.number().min(0),
    contingency_pct: z.number().min(0).max(1),
    monthly: z.object({
      taxes: z.number().min(0),
      insurance: z.number().min(0),
      hoa: z.number().min(0),
      utilities: z.number().min(0),
    }),
    close_cost_items_seller: z.array(MoneyRow).optional(),
    close_cost_items_buyer: z.array(MoneyRow).optional(),
    essentials_moveout_cash: z.number().min(0).optional(),
    concessions_pct: z.number().min(0).max(1).optional(),
  }),
  debt: z.object({
    senior_principal: z.number().min(0),
    senior_per_diem: z.number().min(0),
    good_thru_date: z.string().nullable().optional(),
    juniors: z.array(MoneyRow).optional(),
  }),
  timeline: z.object({
    days_to_ready_list: z.number().min(0),
    days_to_sale_manual: z.number().min(0),
    timeline_total_days: z.number().min(0).optional(),
  }),
}).passthrough();

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const n = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : 0);
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

function computeDTM(deal: EngineDeal) {
  const manual_days = Math.max(0, n(deal.timeline.days_to_sale_manual));
  const default_cash_close_days = Math.max(0, Math.round(n(deal.market.dom_zip) + 35)); // SOT default
  const useManual = manual_days > 0 && manual_days <= default_cash_close_days;

  return {
    manual_days,
    default_cash_close_days,
    chosen_days: useManual ? manual_days : default_cash_close_days,
    reason: useManual ? "manual" as const : "dom+35" as const,
  };
}

function computeDealMath(deal: EngineDeal) {
  // DTM first (earliest-of)
  const dtm = computeDTM(deal);

  // Carry (cap 5.0 mo)
  const hold_monthly =
    n(deal.costs.monthly.taxes) +
    n(deal.costs.monthly.insurance) +
    n(deal.costs.monthly.hoa) +
    n(deal.costs.monthly.utilities);

  const total_days = n(deal.timeline.days_to_ready_list) + dtm.chosen_days;
  const hold_months = clamp(total_days / 30, 0, 5);

  // Respect Floor pieces
  const juniors = sum((deal.debt.juniors ?? []).map((j) => n(j.amount)));
  const payoff_plus_essentials =
    n(deal.debt.senior_principal) + juniors + n(deal.costs.essentials_moveout_cash);

  // Investor floors will be filled from ZIP dataset; scaffold now
  const investor: null | { p20_floor: number; typical_floor: number } = null;
  const operational = Math.max(payoff_plus_essentials, investor?.typical_floor ?? 0);

  return {
    dtm,
    carry: { hold_monthly, hold_months, total_days },
    floors: { payoff_plus_essentials, investor, operational },
  };
}

export async function POST(req: Request) {
  try {
    const raw = await req.json().catch(() => ({}));
    const deal = uiToEngine(raw?.deal ?? raw ?? {});
    const parsed = EngineDealSchema.safeParse(deal);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, issues: parsed.error.format() }, { status: 400 });
    }
    const math = computeDealMath(parsed.data);
    return NextResponse.json({ ok: true, math, echoes: { deal: parsed.data } });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Bad Request" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "underwrite" });
}
