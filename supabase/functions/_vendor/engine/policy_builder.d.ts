import type { AnalyzeSandboxOptions } from "@hps-internal/contracts";
import type { UnderwritingPolicy } from "./compute_underwriting";
export declare function buildUnderwritingPolicyFromOptions(basePolicy: UnderwritingPolicy, sandboxOptions: AnalyzeSandboxOptions | null | undefined): UnderwritingPolicy;
