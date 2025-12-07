import type { RepairProfileListQuery } from "@hps-internal/contracts";

type ListOptions = RepairProfileListQuery;

export function buildListPath(params?: ListOptions) {
  const searchParams = new URLSearchParams();
  if (params?.dealId) searchParams.set("dealId", params.dealId);
  if (params?.marketCode) searchParams.set("marketCode", params.marketCode);
  if (params?.posture) searchParams.set("posture", params.posture);
  if (params?.includeInactive) searchParams.set("includeInactive", "true");

  const qs = searchParams.toString();
  return qs
    ? `v1-repair-profiles?${qs}`
    : "v1-repair-profiles";
}
