function normalizeDeal(deal) {
    // Minimal normalization that matches your endpoint’s current behavior:
    const out = {};
    for (const [k, v] of Object.entries(deal || {})) {
        if (typeof v === "string") {
            const s = v.trim();
            if (/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(s) || /^\d+(\.\d+)?$/.test(s)) {
                out[k] = Number(s.replace(/,/g, ""));
            }
            else if (/^(true|false)$/i.test(s)) {
                out[k] = /^true$/i.test(s);
            }
            else {
                out[k] = s;
            }
        }
        else {
            out[k] = v;
        }
    }
    return out;
}
export function computeUnderwrite(input) {
    const dealNorm = normalizeDeal(input?.deal || {});
    return {
        ok: true,
        math: {},
        echoes: {
            input: dealNorm,
            raw: { deal: dealNorm, policy: input?.policy || {} }
        }
    };
}
