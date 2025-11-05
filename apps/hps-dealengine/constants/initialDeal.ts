/**
 * Minimal, safe deal seed used across the app.
 * Only includes the fields the current UI touches.
 */
const initialDeal: any = {
  market: { arv: 0, as_is_value: 0, dom_zip: 0, moi_zip: 0, price_to_list_pct: 1 },
  debt:   { senior_principal: 0, senior_per_diem: 0, good_thru_date: null, juniors: [] },
  costs:  { repairs_base: 0, concessions_pct: 0 },
  policy: { manual_days_to_money: null }
};

export default initialDeal;