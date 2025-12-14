export type RentcastDealAddress = {
  address: string | null | undefined;
  city: string | null | undefined;
  state: string | null | undefined;
  zip: string | null | undefined;
};

export function formatRentcastAddress(deal: RentcastDealAddress): string {
  const street = (deal.address ?? "").trim().replace(/,+$/, "");
  const city = (deal.city ?? "").trim();
  const state = (deal.state ?? "").trim();
  const zip = (deal.zip ?? "").trim();

  const cityStateZip =
    city && state
      ? `${city}, ${state}${zip ? ` ${zip}` : ""}`
      : city
      ? `${city}${zip ? ` ${zip}` : ""}`
      : state
      ? `${state}${zip ? ` ${zip}` : ""}`
      : zip;

  return [street, cityStateZip].filter((part) => part && part.length > 0).join(", ");
}

export function buildRentcastClosedSalesRequest(opts: {
  deal: RentcastDealAddress;
  radiusMiles: number;
  saleDateRangeDays: number;
  propertyType?: string | null;
}): { request: string | null; hasAddress: boolean } {
  const params = new URLSearchParams();
  const formattedAddress = formatRentcastAddress(opts.deal);
  if (formattedAddress) {
    params.set("address", formattedAddress);
  }
  params.set("radius", opts.radiusMiles.toString());
  params.set("saleDateRange", opts.saleDateRangeDays.toString());
  if (opts.propertyType) {
    params.set("propertyType", opts.propertyType);
  }
  const request = params.toString() || null;
  return { request, hasAddress: !!formattedAddress };
}
