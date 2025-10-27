/* apps/dealengine/app/api/underwrite/route.ts */
import { NextResponse } from "next/server";
import { z } from "zod";
import { uiToEngine, type EngineDeal } from "../../../lib/contract-adapter";

const MoneyRow = z.object({ label: z.string().optional(), amount: z.number().finite() });
const EngineDealSchema = z.object({
  market: z.object({
    aiv: z.number().min(0), arv: z.number().min(0),
    dom_zip: z.number(), moi_zip: z.number(),
    "price-to-list-pct": z.number().min(0).max(1).optional()
  }),
  costs: z.object({
    repairs_base: z.number().min(0),
    contingency_pct: z.number().min(0).max(1),
    monthly: z.object({ taxes: z.number().min(0), insurance: z.number().min(0), hoa: z.number().min(0), utilities: z.number().min(0) }),
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
}).strict();

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const n = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : 0);

function computeBasicMath(deal: EngineDeal) {
  // Carry (cap 5.0 mo) — aligns with your SOT carry rule (DOM+35 later). :contentReference[oaicite:1]{index=1}
  const hold_monthly =
    n(deal.costs.monthly.taxes) +
    n(deal.costs.monthly.insurance) +
    n(deal.costs.monthly.hoa) +
    n(deal.costs.monthly.utilities);

  const total_days = n(deal.timeline.days_to_ready_list) + n(deal.timeline.days_to_sale_manual);
  const hold_months = Math.min(5, Math.max(0, total_days / 30));

  // Payoff + essentials component of Respect Floor (investor floors will be added when ZIP data is wired). :contentReference[oaicite:2]{index=2}
  const juniors = sum((deal.debt.juniors ?? []).map((j) => n(j.amount)));
  const payoff_plus_essentials = n(deal.debt.senior_principal) + juniors + n(deal.costs.essentials_moveout_cash);

  return {
    carry: { hold_monthly, hold_months },
    floors: {
      payoff_plus_essentials,
      investor: null as null | { p20_floor: number; typical_floor: number },
      operational: payoff_plus_essentials, // temporary until investor floors are active
    },
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
    const math = computeBasicMath(parsed.data);
    return NextResponse.json({ ok: true, math, echoes: { deal: parsed.data } });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Bad Request" }, { status: 400 });
  }
}
