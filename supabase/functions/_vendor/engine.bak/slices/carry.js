export function carryMonthsFromDom(domZip, capMonths) {
    const d = typeof domZip === "number" && Number.isFinite(domZip) ? domZip : null;
    if (d === null)
        return null;
    const raw = (d + 35) / 30;
    const c = typeof capMonths === "number" && Number.isFinite(capMonths) ? capMonths : undefined;
    const out = typeof c === "number" ? Math.min(raw, c) : raw;
    return Number(out.toFixed(4));
}
