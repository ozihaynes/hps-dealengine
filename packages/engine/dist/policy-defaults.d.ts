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
    deedStampRateDefault: number;
    deedStampRateMiamiDadeSFR: number;
    deedStampRateMiamiDadeOther: number;
    noteDocStampRate: number;
    intangibleTaxRate: number;
    titlePremiumBands: TitlePremiumBand[];
    recordingFeeBase: number;
    recordingFeePerPageAdditional: number;
}
export declare const dcPolicyDefaults: DCPolicy;
