import { describe, expect, it } from "vitest";
import { fetchRepairRateSet } from "../../../supabase/functions/v1-repair-rates/logic";

function makeSupabaseMock(row: any) {
  const calls: any[] = [];
  return {
    calls,
    from(table: string) {
      const ctx: any = {
        table,
        filters: [] as any[],
        orders: [] as any[],
        select: null as any,
        limit: null as any,
      };
      calls.push(ctx);
      const builder: any = {
        select(cols: string) {
          ctx.select = cols;
          return builder;
        },
        eq(col: string, val: any) {
          ctx.filters.push([col, val]);
          return builder;
        },
        order(col: string, opts: any) {
          ctx.orders.push([col, opts]);
          return builder;
        },
        limit(n: number) {
          ctx.limit = n;
          return builder;
        },
        async maybeSingle() {
          return { data: row, error: null };
        },
      };
      return builder;
    },
  };
}

describe("fetchRepairRateSet", () => {
  it("returns explicit profile when profileId provided", async () => {
    const supabase = makeSupabaseMock({
      id: "80a6",
      org_id: "X",
      market_code: "ORL",
      posture: "base",
    });

    const result = await fetchRepairRateSet({
      supabase,
      selectColumns: "id",
      orgId: "X",
      marketCode: "ORL",
      posture: "base",
      profileId: "80a6",
    });

    expect(result.error).toBeNull();
    expect(result.data?.id).toBe("80a6");
    expect(result.fromProfile).toBe(true);
    expect(supabase.calls[0].filters).toEqual([
      ["id", "80a6"],
      ["org_id", "X"],
      ["market_code", "ORL"],
      ["posture", "base"],
    ]);
  });

  it("falls back to active/default ordering when profileId is null", async () => {
    const supabase = makeSupabaseMock({
      id: "default",
      org_id: "X",
      market_code: "ORL",
      posture: "base",
      is_active: true,
    });

    const result = await fetchRepairRateSet({
      supabase,
      selectColumns: "id",
      orgId: "X",
      marketCode: "ORL",
      posture: "base",
      profileId: null,
    });

    expect(result.error).toBeNull();
    expect(result.data?.id).toBe("default");
    expect(result.fromProfile).toBe(false);
    expect(supabase.calls[0].orders.length).toBeGreaterThan(0);
  });
});
