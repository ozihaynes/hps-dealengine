import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CalibrationChip from "../components/trace/CalibrationChip";

describe("CalibrationChip", () => {
  it("renders missing calibration state", () => {
    const html = renderToStaticMarkup(<CalibrationChip calibration={null} />);

    expect(html).toContain("No calibration metadata on this run.");
  });

  it("renders skipped calibration with reason", () => {
    const html = renderToStaticMarkup(
      <CalibrationChip
        calibration={{
          applied: false,
          reason: "missing strategies",
        }}
      />,
    );

    expect(html).toContain("Calibration skipped: missing strategies");
  });

  it("renders applied calibration details when expanded", () => {
    const useStateSpy = vi.spyOn(React, "useState").mockImplementation(() => [true, () => {}]);

    const html = renderToStaticMarkup(
      <CalibrationChip
        calibration={{
          applied: true,
          weights_version: 3,
          bucket: { market_key: "orlando", home_band: "mid" },
          weights_vector: [
            { strategy: "zeta", weight: 0.4 },
            { strategy: "alpha", weight: 0.6 },
          ],
          contributions: [
            { strategy: "zeta", estimate: 150000, weight: 0.4, contribution: 60000 },
            { strategy: "alpha", estimate: 200000, weight: 0.6, contribution: 120000 },
          ],
        }}
      />,
    );

    useStateSpy.mockRestore();

    expect(html).toContain("Weights v3");
    expect(html).toContain("orlando");
    expect(html).toContain("mid");
    expect(html).toContain("Weights vector");
    expect(html).toContain("Contributions");
    expect(html).toContain("60.0%");
    expect(html).toContain("40.0%");
    expect(html.indexOf("alpha")).toBeLessThan(html.indexOf("zeta"));
  });
});
