import { describe, expect, it } from "vitest";
import { buildListPath } from "./repairProfiles.helpers";
import { extractInvokeErrorMessage } from "./repairProfiles";

describe("repairProfiles helpers", () => {
  it("builds list path with query params", () => {
    const path = buildListPath({
      marketCode: "ORL",
      posture: "base",
      includeInactive: true,
    });

    expect(path).toBe("v1-repair-profiles?marketCode=ORL&posture=base&includeInactive=true");
  });

  it("omits optional params when not provided", () => {
    const path = buildListPath();
    expect(path).toBe("v1-repair-profiles");
  });

  it("surfaces not-found messages from function responses", () => {
    const message = extractInvokeErrorMessage(
      new Error("FunctionsHttpError"),
      { ok: false, error: "REPAIR_PROFILE_NOT_FOUND", message: "Repair profile not found or not accessible" },
      "fallback",
    );
    expect(message).toBe("Repair profile not found or not accessible");
  });

  it("falls back to details when message missing", () => {
    const message = extractInvokeErrorMessage(
      new Error("boom"),
      { ok: false, error: "REPAIR_PROFILES_UPDATE", details: "cannot update" },
      "fallback",
    );
    expect(message).toBe("cannot update");
  });

  it("falls back to error code when message/details missing", () => {
    const message = extractInvokeErrorMessage(
      new Error("boom"),
      { ok: false, error: "REPAIR_PROFILES_CREATE" },
      "fallback",
    );
    expect(message).toBe("REPAIR_PROFILES_CREATE");
  });

  it("uses fallback when no structured payload is present", () => {
    const message = extractInvokeErrorMessage(
      new Error("no body"),
      null,
      "fallback-message",
    );
    expect(message).toBe("fallback-message");
  });
});
