export type BasicComp = {
  id?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  comp_kind?: "closed_sale" | "sale_listing" | string | null;
  price?: number | null;
  distance_miles?: number | null;
  close_date?: string | null;
  status?: string | null;
  listing_type?: string | null;
  [key: string]: unknown;
};

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

const dateToTs = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : null;
};

const stringKey = (comp: BasicComp) =>
  [
    comp.address ?? "",
    comp.city ?? "",
    comp.state ?? "",
    comp.postal_code ?? "",
    comp.id ?? "",
  ]
    .map((v) => (v ?? "").toString().toLowerCase())
    .join("|");

export function sortCompsDeterministic<T extends BasicComp>(comps: T[]): T[] {
  const kindPriority = (kind: string | null | undefined) => (kind === "closed_sale" ? 0 : 1);
  return [...comps].sort((a, b) => {
    const kindDiff = kindPriority(a.comp_kind) - kindPriority(b.comp_kind);
    if (kindDiff !== 0) return kindDiff;

    const distA = Number.isFinite(Number(a.distance_miles)) ? Number(a.distance_miles) : Infinity;
    const distB = Number.isFinite(Number(b.distance_miles)) ? Number(b.distance_miles) : Infinity;
    if (distA !== distB) return distA - distB;

    const closeA = dateToTs(a.close_date);
    const closeB = dateToTs(b.close_date);
    if (closeA !== closeB) return (closeB ?? -Infinity) - (closeA ?? -Infinity);

    const listA = dateToTs((a as any).listed_date ?? (a as any).list_date ?? null);
    const listB = dateToTs((b as any).listed_date ?? (b as any).list_date ?? null);
    if (listA !== listB) return (listB ?? -Infinity) - (listA ?? -Infinity);

    const priceA = Number.isFinite(Number(a.price)) ? Number(a.price) : Infinity;
    const priceB = Number.isFinite(Number(b.price)) ? Number(b.price) : Infinity;
    if (priceA !== priceB) return priceA - priceB;

    const keyA = stringKey(a);
    const keyB = stringKey(b);
    if (keyA < keyB) return -1;
    if (keyA > keyB) return 1;

    return 0;
  });
}

export function selectArvComps<T extends BasicComp>(params: {
  comps: T[];
  minClosedComps: number;
  medianSetSize: number;
}) {
  const { comps, minClosedComps, medianSetSize } = params;
  if (!Number.isFinite(minClosedComps) || minClosedComps <= 0) {
    throw new Error("invalid_min_closed_comps");
  }
  if (!Number.isFinite(medianSetSize) || medianSetSize <= 0) {
    throw new Error("invalid_median_set_size");
  }

  const sorted = sortCompsDeterministic(comps);
  const priced = sorted.filter((c) => Number.isFinite(Number(c.price))) as T[];
  const closed = priced.filter((c) => c.comp_kind === "closed_sale");
  const listings = priced.filter((c) => c.comp_kind === "sale_listing");

  const warningCodes: string[] = [];
  let compKindUsed: "closed_sale" | "sale_listing" | null = null;
  let compsUsed: T[] = [];
  let forceConfidenceC = false;

  if (closed.length >= minClosedComps) {
    compKindUsed = "closed_sale";
    compsUsed = closed;
  } else if (listings.length >= minClosedComps) {
    compKindUsed = "sale_listing";
    compsUsed = listings;
    warningCodes.push("insufficient_closed_sales_comps", "listing_based_comps_only");
    forceConfidenceC = true;
  } else {
    return {
      compKindUsed: null,
      compsUsed: [],
      priceSamples: [] as number[],
      warningCodes,
      forceConfidenceC,
      failureReason: "insufficient_comps",
    };
  }

  const priceSamples = compsUsed.slice(0, medianSetSize).map((c) => Number(c.price));
  const suggestedArv = median(priceSamples);
  const rangeLow = priceSamples.length ? Math.min(...priceSamples) : null;
  const rangeHigh = priceSamples.length ? Math.max(...priceSamples) : null;

  return {
    compKindUsed,
    compsUsed,
    priceSamples,
    warningCodes,
    forceConfidenceC,
    suggestedArv,
    rangeLow,
    rangeHigh,
  };
}
