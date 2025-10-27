/**
 * packages/engine/src/policy-defaults.ts
 * Florida doc stamp & intangible tax rates; title premium bands (FAC 69O-186.003);
 * recording fees default schedule (policy-driven, overridable).
 * Anchors: F.S. 201.02 (deed stamps), F.S. 201.08 (note stamps), F.S. 199.133 (intangible).  // PDF  :contentReference[oaicite:2]{index=2}
 */
export const dcPolicyDefaults = {
    deedStampRateDefault: 0.007,
    deedStampRateMiamiDadeSFR: 0.006,
    deedStampRateMiamiDadeOther: 0.0105,
    noteDocStampRate: 0.0035,
    intangibleTaxRate: 0.002,
    // Common FL title premium schedule (bands) — policy can override as needed
    titlePremiumBands: [
        { upto: 100000, ratePerThousand: 5.75 },
        { upto: 1000000, ratePerThousand: 5.0 },
        { upto: 5000000, ratePerThousand: 2.5 },
        { upto: 10000000, ratePerThousand: 2.25 },
        { upto: null, ratePerThousand: 2.0 },
    ],
    // Recording defaults (policy-driven; counties vary). Safe overridable baseline:
    recordingFeeBase: 10.0,
    recordingFeePerPageAdditional: 8.5,
};
