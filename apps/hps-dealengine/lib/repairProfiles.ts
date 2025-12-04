import type {
  RepairProfileCreateInput,
  RepairProfileListQuery,
  RepairProfileUpdateInput,
  RepairRateProfile,
} from "@hps-internal/contracts";
import { getSupabaseClient } from "./supabaseClient";
import { buildListPath } from "./repairProfiles.helpers";
export { buildListPath } from "./repairProfiles.helpers";

type ListOptions = RepairProfileListQuery;

export function extractInvokeErrorMessage(
  error: unknown,
  data: unknown,
  fallback: string,
): string {
  const payloads: unknown[] = [];
  if (data) payloads.push(data);
  const ctx = (error as any)?.context;
  if (ctx?.body) payloads.push(ctx.body);
  if (ctx?.response?.body) payloads.push(ctx.response.body);
  if (ctx?.response?.error) payloads.push(ctx.response.error);

  for (const body of payloads) {
    if (!body) continue;
    if (typeof body === "string") {
      try {
        const parsed = JSON.parse(body);
        if (parsed && typeof parsed === "object") {
          const msg =
            (parsed as any).message ??
            (parsed as any).error ??
            (parsed as any).details;
          if (typeof msg === "string" && msg.trim().length > 0) {
            return msg.trim();
          }
        }
      } catch {
        if (body.trim().length > 0) {
          return body.trim();
        }
      }
    }
    if (typeof body === "object") {
      const msg =
        (body as any).message ??
        (body as any).error ??
        (body as any).details;
      if (typeof msg === "string" && msg.trim().length > 0) {
        return msg.trim();
      }
    }
  }

  const fallbackMsg =
    (error as any)?.message && typeof (error as any).message === "string"
      ? (error as any).message.trim()
      : null;
  return fallbackMsg && fallbackMsg.length > 0 ? fallbackMsg : fallback;
}

function assertOk<T extends { ok: boolean; error?: string }>(
  response: T,
  fallbackMessage: string,
): asserts response is T & { ok: true } {
  if (!response.ok) {
    throw new Error(response.error ?? fallbackMessage);
  }
}

async function getAccessToken() {
  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData.session?.access_token ?? null;
}

export async function fetchRepairProfiles(
  params?: ListOptions,
): Promise<RepairRateProfile[]> {
  const supabase = getSupabaseClient();
  const path = buildListPath(params);
  const accessToken = await getAccessToken();

  if (process.env.NODE_ENV !== "production") {
    console.debug("[repairProfiles] list invoke", {
      path,
      orgId: params?.orgId,
      marketCode: params?.marketCode,
      posture: params?.posture,
      includeInactive: params?.includeInactive,
      hasAuth: !!accessToken,
    });
  }

  const { data, error } = await supabase.functions.invoke(path, {
    method: "GET",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });

  if (error) {
    const message = extractInvokeErrorMessage(
      error,
      data,
      "Failed to load repair profiles",
    );
    throw new Error(message);
  }

  const payload = (data ?? {}) as {
    ok: boolean;
    profiles?: RepairRateProfile[];
    error?: string;
  };
  assertOk(payload, payload.error ?? "Failed to load repair profiles");

  return payload.profiles ?? [];
}

export async function createRepairProfile(
  input: RepairProfileCreateInput,
): Promise<RepairRateProfile> {
  const supabase = getSupabaseClient();
  const accessToken = await getAccessToken();

  if (process.env.NODE_ENV !== "production") {
    console.debug("[repairProfiles] create invoke", {
      marketCode: input.marketCode,
      posture: input.posture,
      orgId: input.orgId,
      dealId: (input as any).dealId,
      cloneFromId: input.cloneFromId,
      isActive: input.isActive,
      isDefault: input.isDefault,
      hasAuth: !!accessToken,
    });
  }

  const { data, error } = await supabase.functions.invoke(
    "v1-repair-profiles",
    {
      method: "POST",
      body: {
        ...input,
        orgId: undefined, // org resolved server-side
      },
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
    },
  );

  if (error) {
    const message = extractInvokeErrorMessage(
      error,
      data,
      "Failed to create repair profile",
    );
    throw new Error(message);
  }

  const payload = (data ?? {}) as {
    ok: boolean;
    profile?: RepairRateProfile;
    error?: string;
  };
  assertOk(payload, payload.error ?? "Failed to create repair profile");
  if (!payload.profile) {
    throw new Error("Profile response missing");
  }

  return payload.profile;
}

export async function updateRepairProfile(
  input: RepairProfileUpdateInput,
): Promise<RepairRateProfile> {
  const supabase = getSupabaseClient();
  const accessToken = await getAccessToken();

  if (process.env.NODE_ENV !== "production") {
    console.debug("[repairProfiles] update invoke", {
      id: input.id,
      orgId: input.orgId,
      dealId: (input as any).dealId,
      isActive: input.isActive,
      isDefault: input.isDefault,
      hasAuth: !!accessToken,
    });
  }

  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const { data, error } = await supabase.functions.invoke(
    "v1-repair-profiles",
    {
      method: "PUT",
      body: {
        ...input,
        orgId: undefined, // org resolved server-side
      },
      headers: Object.keys(headers).length ? headers : undefined,
    },
  );

  if (error) {
    const message = extractInvokeErrorMessage(
      error,
      data,
      "Failed to update repair profile",
    );
    throw new Error(message);
  }

  const payload = (data ?? {}) as {
    ok: boolean;
    profile?: RepairRateProfile;
    error?: string;
  };
  assertOk(payload, payload.error ?? "Failed to update repair profile");
  if (!payload.profile) {
    throw new Error("Profile response missing");
  }

  return payload.profile;
}

export async function setActiveRepairProfile(args: {
  id: string;
  isDefault?: boolean;
  dealId?: string | null;
}): Promise<RepairRateProfile> {
  return updateRepairProfile({
    id: args.id,
    isActive: true,
    isDefault: args.isDefault ?? false,
    dealId: args.dealId ?? undefined,
  });
}
