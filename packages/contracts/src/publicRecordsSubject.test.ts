import { describe, expect, it } from "vitest";

import { stableHash, stableStringify } from "./determinismHash";
import { normalizeAttomSubject } from "./publicRecordsSubject";

const attomSampleA = {
  property: [
    {
      summary: {
        propType: "SFR",
        yearBuilt: 2005,
      },
      building: {
        rooms: {
          beds: 5,
          bathsTotal: 3,
          bathsFull: 3,
        },
        size: {
          universalSize: 2585,
          livingSize: 2585,
          bldgSize: 2585,
          grossSizeAdjusted: 2585,
        },
      },
      location: {
        latitude: "28.522003",
        longitude: "-81.135398",
      },
    },
  ],
};

const attomSampleB = {
  property: [
    {
      location: {
        longitude: "-81.135398",
        latitude: "28.522003",
      },
      building: {
        size: {
          universalsize: 2585,
          livingSize: 2585,
        },
        rooms: {
          bathstotal: 3,
          bathsfull: 3,
          beds: 5,
        },
      },
      summary: {
        proptype: "SFR",
        yearbuilt: 2005,
      },
    },
  ],
};

describe("normalizeAttomSubject", () => {
  it("normalizes deterministically across key order", () => {
    const asOf = "2025-01-01T00:00:00Z";
    const a = normalizeAttomSubject(attomSampleA, asOf);
    const b = normalizeAttomSubject(attomSampleB, asOf);

    expect(a).toEqual(b);
    expect(stableStringify(a)).toEqual(stableStringify(b));
    expect(stableHash(a)).toEqual(stableHash(b));
    expect(a).toMatchObject({
      beds: 5,
      baths: 3,
      sqft: 2585,
      year_built: 2005,
      property_type: "singlefamily",
      latitude: 28.522003,
      longitude: -81.135398,
    });
  });

  it("handles missing fields safely", () => {
    const result = normalizeAttomSubject({}, "2025-01-01T00:00:00Z");
    expect(result).toMatchObject({
      beds: null,
      baths: null,
      sqft: null,
      year_built: null,
      property_type: null,
      source: "attom",
    });
  });
});
