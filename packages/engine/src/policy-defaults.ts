/**
 * packages/engine/src/policy-defaults.ts
 * Florida doc stamp & intangible tax rates; title premium bands (FAC 69O-186.003);
 * recording fees default schedule (policy-driven, overridable).
 * Anchors: F.S. 201.02 (deed stamps), F.S. 201.08 (note stamps), F.S. 199.133 (intangible).  // PDF  :contentReference[oaicite:2]{index=2}
 */

export type CountyCode = 'MIAMI-DADE' | 'OTHER';
export type PropertyType = 'SFR' | 'OTHER';

export interface TitlePremiumBand {
  /** inclusive upper bound in USD; null = no upper bound */
  upto: number | null;
  /** rate per $1,000 of coverage within the band */
  ratePerThousand: number;
}

export interface DCPolicy {
  deedStampRateDefault: number; // 0.007 statewide (F.S. 201.02)
  deedStampRateMiamiDadeSFR: number; // 0.006 (Miami-Dade SFR)
  deedStampRateMiamiDadeOther: number; // 0.0105 (Miami-Dade other)
  noteDocStampRate: number; // 0.0035 (F.S. 201.08)
  intangibleTaxRate: number; // 0.002 (F.S. 199.133)
  titlePremiumBands: TitlePremiumBand[]; // FAC 69O-186.003 — overridable schedule
  recordingFeeBase: number; // default base fee
  recordingFeePerPageAdditional: number; // per additional page
}

export const dcPolicyDefaults: DCPolicy = {
  deedStampRateDefault: 0.007,
  deedStampRateMiamiDadeSFR: 0.006,
  deedStampRateMiamiDadeOther: 0.0105,
  noteDocStampRate: 0.0035,
  intangibleTaxRate: 0.002,
  // Common FL title premium schedule (bands) — policy can override as needed
  titlePremiumBands: [
    { upto: 100_000, ratePerThousand: 5.75 },
    { upto: 1_000_000, ratePerThousand: 5.0 },
    { upto: 5_000_000, ratePerThousand: 2.5 },
    { upto: 10_000_000, ratePerThousand: 2.25 },
    { upto: null, ratePerThousand: 2.0 },
  ],
  // Recording defaults (policy-driven; counties vary). Safe overridable baseline:
  recordingFeeBase: 10.0,
  recordingFeePerPageAdditional: 8.5,
};
