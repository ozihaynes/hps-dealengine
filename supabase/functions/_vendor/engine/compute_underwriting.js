/**
 * Deterministic underwriting core (MVP).
 * - Resolves AIV cap and fee rates from an already-token-resolved policy.
 * - Adds Carry Months (DOM→months with cap) using tokens.
 * - Returns caps + fee rates + fee preview + carry, with round-to-cents math.
 * - Adds a provenance trace and infoNeeded for any missing policy inputs.
 */
function round2(n) {
    return Math.round(n * 100) / 100;
}
function getNumber(obj, path, fallback = null) {
    let cur = obj;
    for (const k of path) {
        if (cur == null)
            return fallback;
        cur = cur[k];
    }
    if (typeof cur === 'number' && Number.isFinite(cur))
        return cur;
    return fallback;
}
function getString(obj, path, fallback = null) {
    let cur = obj;
    for (const k of path) {
        if (cur == null)
            return fallback;
        cur = cur[k];
    }
    if (typeof cur === 'string' && cur.length > 0)
        return cur;
    return fallback;
}
/** Parse a simple DOM→months rule like "DOM/30". Unknown patterns fall back to DOM/30. */
function monthsFromDom(dom, rule) {
    const r = (rule ?? 'DOM/30').trim().toUpperCase();
    const m = r.match(/^DOM\s*\/\s*(\d+(\.\d+)?)$/);
    const divisor = m ? Number(m[1]) : 30;
    if (!Number.isFinite(divisor) || divisor <= 0)
        return dom / 30;
    return dom / divisor;
}
export function computeUnderwriting(deal, policy) {
    const infoNeeded = [];
    const trace = [];
    const summaryNotes = [];
    // ---- Inputs from deal
    const aiv = getNumber(deal, ['market', 'aiv'], null);
    const domZip = getNumber(deal, ['market', 'dom_zip'], null);
    if (aiv == null) {
        infoNeeded.push({
            path: 'deal.market.aiv',
            token: null,
            reason: 'AIV (as-is value) required to compute caps and fee preview.',
            source_of_truth: 'investor_set',
        });
    }
    // ---- Policy tokens (already resolved by API)
    // AIV safety cap percent (e.g., 0.97)
    const aivCapPct = getNumber(policy, ['aiv', 'safety_cap_pct_token'], null) ??
        getNumber(policy, ['aiv', 'safety_cap_pct'], null);
    if (aivCapPct == null) {
        infoNeeded.push({
            path: 'policy.aiv.safety_cap_pct_token',
            token: '<AIV_CAP_PCT>',
            reason: 'Missing AIV safety cap percentage.',
            source_of_truth: 'team_policy_set',
        });
    }
    // Carry: rule + hard cap
    const carryRule = getString(policy, ['carry', 'dom_to_months_rule_token'], null) ??
        getString(policy, ['carry', 'dom_to_months_rule'], null);
    const carryCap = getNumber(policy, ['carry', 'months_cap_token'], null) ??
        getNumber(policy, ['carry', 'months_cap'], null);
    if (carryRule == null) {
        infoNeeded.push({
            path: 'policy.carry.dom_to_months_rule_token',
            token: '<DOM_TO_MONTHS_RULE>',
            reason: 'Missing DOM→months rule.',
            source_of_truth: 'team_policy_set',
        });
    }
    if (carryCap == null) {
        infoNeeded.push({
            path: 'policy.carry.months_cap_token',
            token: '<CARRY_MONTHS_CAP>',
            reason: 'Missing hard cap on carry months.',
            source_of_truth: 'team_policy_set',
        });
    }
    // Fee rates (percent as decimal)
    const listPct = getNumber(policy, ['fees', 'list_commission_pct_token'], null) ??
        getNumber(policy, ['fees', 'list_commission_pct'], null);
    const concessionsPct = getNumber(policy, ['fees', 'concessions_pct_token'], null) ??
        getNumber(policy, ['fees', 'concessions_pct'], null);
    const sellClosePct = getNumber(policy, ['fees', 'sell_close_pct_token'], null) ??
        getNumber(policy, ['fees', 'sell_close_pct'], null);
    if (listPct == null) {
        infoNeeded.push({
            path: 'policy.fees.list_commission_pct_token',
            token: '<LIST_COMM_PCT>',
            reason: 'Missing list commission percentage.',
            source_of_truth: 'team_policy_set',
        });
    }
    if (concessionsPct == null) {
        infoNeeded.push({
            path: 'policy.fees.concessions_pct_token',
            token: '<CONCESSIONS_PCT>',
            reason: 'Missing concessions percentage.',
            source_of_truth: 'team_policy_set',
        });
    }
    if (sellClosePct == null) {
        infoNeeded.push({
            path: 'policy.fees.sell_close_pct_token',
            token: '<SELL_CLOSE_PCT>',
            reason: 'Missing seller-side closing cost percentage.',
            source_of_truth: 'team_policy_set',
        });
    }
    // ---- Caps
    let aivCapApplied = false;
    let aivCapValue = null;
    if (aiv != null && aivCapPct != null) {
        const capped = round2(aiv * aivCapPct);
        aivCapValue = capped;
        aivCapApplied = capped < aiv;
        trace.push({
            rule: 'AIV_CAP',
            used: ['deal.market.aiv', 'policy.aiv.safety_cap_pct_token'],
            details: { aiv, cap_pct: aivCapPct, cap_value: capped, applied: aivCapApplied },
        });
        summaryNotes.push(aivCapApplied
            ? `AIV safety cap applied at ${aivCapPct}; capped AIV = ${capped.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}.`
            : `AIV safety cap not binding; cap = ${round2(aivCapPct * 100).toFixed(0)}% of AIV.`);
    }
    else {
        trace.push({
            rule: 'AIV_CAP',
            used: ['deal.market.aiv', 'policy.aiv.safety_cap_pct_token'],
            details: { aiv, cap_pct: aivCapPct, message: 'Insufficient inputs for cap.' },
        });
    }
    const basePrice = aivCapValue ?? aiv ?? 0;
    // ---- Carry Months (DOM → months, clamped)
    let rawMonths = null;
    let carryMonths = null;
    if (domZip != null) {
        rawMonths = monthsFromDom(domZip, carryRule);
    }
    if (rawMonths != null) {
        carryMonths = carryCap != null ? Math.min(rawMonths, carryCap) : rawMonths;
    }
    trace.push({
        rule: 'CARRY_MONTHS',
        used: [
            'deal.market.dom_zip',
            'policy.carry.dom_to_months_rule_token',
            'policy.carry.months_cap_token',
        ],
        details: {
            dom_zip: domZip,
            rule: carryRule ?? null,
            raw_months: rawMonths,
            months_cap: carryCap ?? null,
            carry_months: carryMonths,
        },
    });
    if (domZip != null) {
        summaryNotes.push(carryMonths != null
            ? `Carry months = ${carryMonths.toFixed(2)} (rule ${carryRule ?? 'DOM/30'}, raw ${rawMonths?.toFixed(2)}).`
            : `DOM provided (${domZip}) but carry months not computed due to missing rule/cap.`);
    }
    // ---- Fees preview
    const lp = listPct ?? 0;
    const cp = concessionsPct ?? 0;
    const sp = sellClosePct ?? 0;
    const listAmt = round2(basePrice * lp);
    const consAmt = round2(basePrice * cp);
    const sellCloseAmt = round2(basePrice * sp);
    const totalSellerSide = round2(listAmt + consAmt + sellCloseAmt);
    trace.push({
        rule: 'FEES_PREVIEW',
        used: [
            'policy.fees.list_commission_pct_token',
            'policy.fees.concessions_pct_token',
            'policy.fees.sell_close_pct_token',
            'basePrice',
        ],
        details: {
            basePrice,
            list_commission_pct: lp,
            concessions_pct: cp,
            sell_close_pct: sp,
            list_commission_amount: listAmt,
            concessions_amount: consAmt,
            sell_close_amount: sellCloseAmt,
            total_seller_side_costs: totalSellerSide,
        },
    });
    const outputs = {
        caps: { aivCapApplied, aivCapValue },
        carry: {
            monthsRule: carryRule ?? null,
            monthsCap: carryCap ?? null,
            rawMonths,
            carryMonths,
        },
        fees: {
            rates: {
                list_commission_pct: lp,
                concessions_pct: cp,
                sell_close_pct: sp,
            },
            preview: {
                base_price: basePrice,
                list_commission_amount: listAmt,
                concessions_amount: consAmt,
                sell_close_amount: sellCloseAmt,
                total_seller_side_costs: totalSellerSide,
            },
        },
        summaryNotes,
    };
    return { ok: true, infoNeeded, trace, outputs };
}
