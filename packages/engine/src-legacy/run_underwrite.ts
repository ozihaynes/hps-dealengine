import { computeUnderwriting } from './compute_underwriting.js';
import type { EngineDeal } from './types.js';
import type { UnderwritePolicy } from './policy-defaults.js';

// Stable entry for tests/app. Adds legacy aliases and normalizes ceilings.
// No math changes to the engine itself.
export function runUnderwrite(deal: EngineDeal, policy?: UnderwritePolicy) {
  const out: any = computeUnderwriting(deal, policy);

  // --- Legacy DTM aliases ---
  if (out?.dtm) {
    if (out.dtm.reason === undefined) out.dtm.reason = out.dtm.method;
    if (out.dtm.chosen_days === undefined) out.dtm.chosen_days = out.dtm.days;
  }

  // --- Legacy CARRY aliases ---
  if (out?.carry) {
    if (out.carry.hold_monthly === undefined) out.carry.hold_monthly = out.carry.amount_monthly;
    const d = out?.dtm?.chosen_days ?? out?.dtm?.days;
    if (typeof d === 'number') out.carry.hold_months = d / 30;
    else if (out.carry.hold_months === undefined && typeof out.carry.months === 'number') {
      out.carry.hold_months = out.carry.months;
    }
  }

  // --- Helpers ---
  const n = (x: any) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
  const pct = (p: any, def = 0) => {
    if (typeof p !== 'number' || !Number.isFinite(p)) return def;
    return p > 1 ? p / 100 : p;
  };
  const normLabel = (raw: string) => {
    const s = (raw || '').toLowerCase();
    const t = s.replace(/[^a-z]/g, '');
    if (t.includes('flip') || /fixandflip|rehab|renovate|repair/.test(t)) return 'flip';
    if (
      t.includes('whole') ||
      /wholetale|hotel|hotail|asisretail|retailasis|asissale|lighttouch/.test(t)
    )
      return 'wholetail';
    return s || 'other';
  };

  if (!out.ceilings) out.ceilings = {};
  if (!Array.isArray(out.ceilings.candidates)) out.ceilings.candidates = [];

  // Normalize any existing candidates
  const numKeys = ['value', 'mao', 'max', 'offer', 'ceiling', 'price', 'amount', 'cap', 'target'];
  out.ceilings.candidates = out.ceilings.candidates.map((c: any) => {
    const label = normLabel(String(c?.label ?? ''));
    const value = numKeys
      .map((k) => c?.[k])
      .find((v) => typeof v === 'number' && Number.isFinite(v));
    return { ...c, label, value };
  });

  // --- Deep-scan for hidden flip/wholetail numbers (prefer real MAOs if they exist) ---
  const have = (name: string) =>
    out.ceilings.candidates.some((c: any) => c.label === name && typeof c.value === 'number');

  const deepFind = (obj: any, want: 'flip' | 'wholetail'): number | undefined => {
    const keyRe =
      want === 'flip'
        ? /(flip|fix.?and.?flip|rehab|renovat|repair)/i
        : /(whole.?tail|whole|wholetale|hotel|hotail|as.?is|retail|light.?touch)/i;
    let found: number | undefined;
    const visit = (o: any) => {
      if (!o || typeof o !== 'object' || found !== undefined) return;
      for (const [k, v] of Object.entries(o)) {
        if (found !== undefined) break;
        if (keyRe.test(k)) {
          if (typeof v === 'number' && Number.isFinite(v)) {
            found = v;
            break;
          }
          if (v && typeof v === 'object') {
            for (const kk of numKeys) {
              const vv = (v as any)[kk];
              if (typeof vv === 'number' && Number.isFinite(vv)) {
                found = vv;
                break;
              }
            }
          }
        }
        if (found === undefined && typeof v === 'object') visit(v as any);
      }
    };
    visit(obj);
    return found;
  };

  const pushIf = (label: 'flip' | 'wholetail', value: number, reason: string) => {
    // Clamp to AIV cap if present/applicable
    const aiv = n(deal?.market?.aiv);
    const capPct = pct((policy as any)?.aiv_cap_pct, 0.97);
    const capped = aiv ? Math.min(value, aiv * capPct) : value;
    out.ceilings.candidates.push({ label, value: capped, eligible: true, reason });
  };

  // Try to use real values if they exist somewhere in the output
  const flipScan = deepFind(out, 'flip');
  const wtScan = deepFind(out, 'wholetail');
  if (!have('flip') && typeof flipScan === 'number' && flipScan > n(deal?.market?.aiv) * 0.2)
    pushIf('flip', flipScan, 'compat:deep-scan');
  if (!have('wholetail') && typeof wtScan === 'number' && wtScan > n(deal?.market?.aiv) * 0.2)
    pushIf('wholetail', wtScan, 'compat:deep-scan');

  // --- Synthesize legacy MAOs if still missing or clearly wrong ---
  const needFlip =
    !have('flip') ||
    (out.ceilings.candidates.find((c: any) => c.label === 'flip')?.value ?? 0) <
      n(deal?.market?.aiv) * 0.2;
  const needWt = !have('wholetail');

  if (needFlip || needWt) {
    const arv = n(deal?.market?.arv);
    const aiv = n(deal?.market?.aiv);
    const sellClose =
      pct((policy as any)?.sell_close_pct) ||
      pct((policy as any)?.list_commission_pct) + pct((policy as any)?.sell_close_extra_pct) ||
      0.08; // default
    const margin = pct(
      (policy as any)?.profit_margin_ceiling ??
        (policy as any)?.profit_margin ??
        (policy as any)?.margin_ceiling,
      0.15
    );

    const baseNet = arv ? arv * (1 - sellClose - margin) : 0;

    const repairsBase = n(deal?.costs?.repairs_base);
    const cont = pct(deal?.costs?.contingency_pct, 0.15);
    const flipRepairs = repairsBase * (1 + cont);

    const wtRatio = pct((policy as any)?.wholetail_repair_ratio, 0.33);
    const wtRepairs = repairsBase * wtRatio;

    const m = (deal?.costs?.monthly as any) || {};
    // Prefer engine-computed hold_* if available
    const holdMonthly =
      n(out?.carry?.hold_monthly) ||
      n(m.hoa) + n(m.utilities) + n(m.taxes) / 12 + n(m.insurance) / 12;
    const holdMonths =
      n(out?.carry?.hold_months) ||
      (typeof out?.dtm?.chosen_days === 'number'
        ? out.dtm.chosen_days
        : n(deal?.timeline?.days_to_sale_manual || 0)) / 30;
    const carryTotal = holdMonthly * holdMonths;

    if (needFlip) pushIf('flip', baseNet - flipRepairs - carryTotal, 'compat:derived');
    if (needWt) pushIf('wholetail', baseNet - wtRepairs - carryTotal, 'compat:derived');
  }

  // --- Choose ceiling per SOT: min(cap, max(flip, wholetail)) ---
  {
    const aiv = n(deal?.market?.aiv);
    const capPct = pct((policy as any)?.aiv_cap_pct, 0.97);
    const capVal = aiv ? aiv * capPct : Infinity;

    const flipVal = out.ceilings.candidates.find(
      (c: any) => c.label === 'flip' && typeof c.value === 'number'
    )?.value;
    const wtVal = out.ceilings.candidates.find(
      (c: any) => c.label === 'wholetail' && typeof c.value === 'number'
    )?.value;
    const best = Math.max(n(flipVal), n(wtVal));
    if (best > 0) out.ceilings.chosen = Math.min(best, capVal);
  }

  // Optional: debug candidates
  if (process?.env?.HPS_DEBUG_CANDIDATES === '1' && out?.ceilings?.candidates) {
    // eslint-disable-next-line no-console
    console.log(
      'CANDIDATES_DEBUG',
      out.ceilings.candidates.map((c: any) => ({
        label: c.label,
        keys: Object.keys(c),
        value: c.value,
      }))
    );
  }

  return out;
}

// Back-compat alias used by older callers
export const underwrite = runUnderwrite;
