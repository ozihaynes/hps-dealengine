export interface UnderwriteInput {
    deal: Record<string, unknown>;
    policy?: Record<string, unknown>;
}
export interface UnderwriteResult {
    ok: boolean;
    math: Record<string, unknown>;
    echoes: {
        input: Record<string, unknown>;
        raw: {
            deal: Record<string, unknown>;
            policy: Record<string, unknown>;
        };
    };
}
export declare function computeUnderwrite(input: UnderwriteInput): UnderwriteResult;
