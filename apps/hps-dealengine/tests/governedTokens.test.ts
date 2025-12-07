import { describe, expect, it } from "vitest";
import {
  GOVERNED_TOKENS,
  canEditGoverned,
  isGovernedToken,
} from "../constants/governedTokens";

describe("governed tokens", () => {
  it("locks analysts and allows managers/owners", () => {
    expect(GOVERNED_TOKENS.length).toBeGreaterThan(0);
    expect(isGovernedToken("policy.min_spread")).toBe(true);
    expect(canEditGoverned("analyst")).toBe(false);
    expect(canEditGoverned("manager")).toBe(true);
    expect(canEditGoverned("owner")).toBe(true);
  });
});
