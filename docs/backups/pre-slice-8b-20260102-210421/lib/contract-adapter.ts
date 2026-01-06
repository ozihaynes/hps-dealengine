/* apps/dealengine/lib/contract-adapter.ts */
export type MoneyRow = { label?: string; amount: number };

export type EngineDeal = {
  market: {
    aiv: number;
    arv: number;
    dom_zip: number;
    moi_zip: number;
    ['price-to-list-pct']?: number; // 0..1
  };
  costs: {
    repairs_base: number;
    contingency_pct: number; // 0..1
    monthly: { taxes: number; insurance: number; hoa: number; utilities: number };
    close_cost_items_seller?: MoneyRow[];
    close_cost_items_buyer?: MoneyRow[];
    essentials_moveout_cash?: number;
    concessions_pct?: number; // 0..1
  };
  debt: {
    senior_principal: number;
    senior_per_diem: number;
    good_thru_date?: string | null;
    juniors?: MoneyRow[];
  };
  timeline: {
    days_to_ready_list: number;
    days_to_sale_manual: number;
    timeline_total_days?: number;
  };
  status?: unknown;
  evidence?: unknown;
};

export type UiDeal = any;

const toNum = (v: any, d = 0) => {
  if (v === null || v === undefined) return d;
  const n = parseFloat(String(v).replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(n) ? n : d;
};
const pct = (v: any) => (typeof v === 'number' ? v : toNum(v) / 100);

export function uiToEngine(ui: UiDeal): EngineDeal {
  const m = ui?.market ?? {},
    c = ui?.costs ?? {},
    cm = c?.monthly ?? {},
    d = ui?.debt ?? {},
    t = ui?.timeline ?? {};
  return {
    market: {
      aiv: toNum(m.as_is_value ?? m.aiv),
      arv: toNum(m.arv),
      dom_zip: toNum(m.dom_zip, 30),
      moi_zip: toNum(m.moi_zip, 2.5),
      ['price-to-list-pct']:
        m['price-to-list-pct'] === undefined ? undefined : pct(m['price-to-list-pct']),
    },
    costs: {
      repairs_base: toNum(c.repairs_base),
      contingency_pct:
        typeof c.contingency_pct === 'number' ? c.contingency_pct : pct(c.contingency_pct),
      monthly: {
        taxes: toNum(cm.taxes),
        insurance: toNum(cm.insurance),
        hoa: toNum(cm.hoa),
        utilities: toNum(cm.utilities),
      },
      close_cost_items_seller: (c.close_cost_items_seller ?? []).map((r: any) => ({
        label: r?.label,
        amount: toNum(r?.amount),
      })),
      close_cost_items_buyer: (c.close_cost_items_buyer ?? []).map((r: any) => ({
        label: r?.label,
        amount: toNum(r?.amount),
      })),
      essentials_moveout_cash: toNum(c.essentials_moveout_cash),
      concessions_pct:
        c.concessions_pct === undefined
          ? undefined
          : typeof c.concessions_pct === 'number'
            ? c.concessions_pct
            : pct(c.concessions_pct),
    },
    debt: {
      senior_principal: toNum(d.senior_principal),
      senior_per_diem: toNum(d.senior_per_diem),
      good_thru_date: d.good_thru_date ?? null,
      juniors: (d.juniors ?? []).map((j: any) => ({ label: j?.label, amount: toNum(j?.amount) })),
    },
    timeline: {
      days_to_ready_list: toNum(t.days_to_ready_list),
      days_to_sale_manual: toNum(t.days_to_sale_manual, 30),
      timeline_total_days:
        t.timeline_total_days === undefined ? undefined : toNum(t.timeline_total_days),
    },
    status: ui?.status,
    evidence: ui?.evidence,
  };
}
