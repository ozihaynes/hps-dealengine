import type { SupabaseClient } from "@supabase/supabase-js";
import { Postures } from "@hps-internal/contracts";
import type { DbDeal } from "./dealSessionContext";

export type PostureValue = (typeof Postures)[number];

export type DealContact = {
  name?: string;
  phone?: string;
  email?: string;
};

export type DealAddress = {
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  postalCode?: string;
};

export type NewDealFormState = {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  propertyStreet: string;
  propertyCity: string;
  propertyState: string;
  propertyPostalCode: string;
};

export type CreateDealInput = {
  supabase: SupabaseClient;
  orgId?: string | null;
  posture?: PostureValue | string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  propertyStreet: string;
  propertyCity: string;
  propertyState: string;
  propertyPostalCode: string;
  payload?: Record<string, unknown> | null;
};

export const DEAL_SELECT =
  "id, org_id, created_by, created_at, updated_at, address, city, state, zip, client_name, client_phone, client_email, payload, organization:organizations(name)";

function trimOrNull(value?: string | null): string | null {
  const next = (value ?? "").trim();
  return next.length > 0 ? next : null;
}

export function normalizeContact(contact?: DealContact | null): DealContact | null {
  if (!contact) return null;

  const name = trimOrNull(contact.name);
  const phone = trimOrNull(contact.phone);
  const email = trimOrNull(contact.email);

  if (!name && !phone && !email) return null;

  const cleaned: DealContact = {};
  if (name) cleaned.name = name;
  if (phone) cleaned.phone = phone;
  if (email) cleaned.email = email;

  return cleaned;
}

export function buildDealPayload({
  basePayload,
  contact,
  address,
}: {
  basePayload?: Record<string, unknown> | null;
  contact?: DealContact | null;
  address: DealAddress;
}): Record<string, unknown> {
  const payload =
    typeof structuredClone === "function"
      ? structuredClone(basePayload ?? {})
      : JSON.parse(JSON.stringify(basePayload ?? {}));

  const contactNormalized = normalizeContact(contact);
  if (contactNormalized) {
    (payload as any).contact = contactNormalized;
    (payload as any).client = contactNormalized;
  }

  const property: Record<string, unknown> =
    typeof (payload as any).property === "object" && (payload as any).property !== null
      ? ((payload as any).property as Record<string, unknown>)
      : {};

  const addressLine = trimOrNull(address.address);
  const city = trimOrNull(address.city);
  const state = trimOrNull(address.state);
  const zip = trimOrNull(address.zip ?? address.postalCode);

  if (addressLine) property.address = addressLine;
  if (city) property.city = city;
  if (state) property.state = state;
  if (zip) property.zip = zip;

  if (Object.keys(property).length > 0) {
    (payload as any).property = property;
  }

  return payload;
}

export function formatAddressLine(address: DealAddress): string {
  const postal = trimOrNull(address.zip ?? address.postalCode);
  const parts = [
    trimOrNull(address.address),
    [trimOrNull(address.city), trimOrNull(address.state)].filter(Boolean).join(", "),
    postal,
  ].filter(Boolean) as string[];

  return parts.join(parts.length > 1 ? ", " : "");
}

export async function resolveOrgId(supabase: SupabaseClient): Promise<string> {
  const { data: orgId, error } = await supabase.rpc("get_caller_org");
  if (error) {
    throw new Error(error.message ?? "Unable to resolve your organization. Please check memberships.");
  }
  if (!orgId) {
    throw new Error("No organization found for your user.");
  }
  return orgId as string;
}

export async function fetchDealsForOrg(
  supabase: SupabaseClient,
  orgId: string,
): Promise<DbDeal[]> {
  const { data, error } = await supabase
    .from("deals")
    .select(DEAL_SELECT)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message ?? "Unable to load deals for your org.");
  }

  return (data ?? []).map(mapDbDeal);
}

function requireValue(label: string, value?: string | null): string {
  const next = trimOrNull(value);
  if (next) return next;
  throw new Error(`${label} is required to create a deal.`);
}

export async function createDealWithClientInfo({
  supabase,
  orgId: explicitOrgId,
  posture,
  clientName,
  clientPhone,
  clientEmail,
  propertyStreet,
  propertyCity,
  propertyState,
  propertyPostalCode,
  payload,
}: CreateDealInput): Promise<DbDeal> {
  const orgId = explicitOrgId ?? (await resolveOrgId(supabase));

  const name = requireValue("Client name", clientName);
  const phone = requireValue("Client phone", clientPhone);
  const email = requireValue("Client email", clientEmail);
  const street = requireValue("Property street", propertyStreet);
  const city = requireValue("Property city", propertyCity);
  const state = requireValue("Property state", propertyState);
  const postalCode = requireValue("Property ZIP", propertyPostalCode);

  const payloadJson = buildDealPayload({
    basePayload: payload ?? {},
    contact: { name, phone, email },
    address: {
      address: street,
      city,
      state,
      zip: postalCode,
      postalCode,
    },
  });

  if (posture) {
    (payloadJson as any).posture = posture;
  }

  const { data, error } = await supabase
    .from("deals")
    .insert({
      org_id: orgId,
      address: street,
      city,
      state,
      zip: postalCode,
      client_name: name,
      client_phone: phone,
      client_email: email,
      payload: payloadJson,
    })
    .select(DEAL_SELECT)
    .single();

  if (error) {
    throw new Error(error.message ?? "Unable to create deal.");
  }

  return mapDbDeal(data);
}

export async function createDeal({
  supabase,
  address,
  contact,
  payload,
  orgId,
  posture,
}: {
  supabase: SupabaseClient;
  address: DealAddress;
  contact?: DealContact | null;
  payload?: Record<string, unknown> | null;
  orgId?: string | null;
  posture?: PostureValue | string | null;
}): Promise<DbDeal> {
  const contactNormalized = normalizeContact(contact ?? null);

  return createDealWithClientInfo({
    supabase,
    orgId,
    posture: posture ?? null,
    clientName: contactNormalized?.name ?? "",
    clientPhone: contactNormalized?.phone ?? "",
    clientEmail: contactNormalized?.email ?? "",
    propertyStreet: address.address,
    propertyCity: address.city ?? "",
    propertyState: address.state ?? "",
    propertyPostalCode: address.zip ?? address.postalCode ?? "",
    payload: payload ?? null,
  });
}

export function mapDbDeal(row: any): DbDeal {
  const organization = (row as any)?.organization ?? (row as any)?.organizations ?? null;
  const orgName = organization?.name ?? null;
  const clientName = (row as any)?.client_name ?? (row as any)?.clientName ?? null;
  const clientPhone = (row as any)?.client_phone ?? (row as any)?.clientPhone ?? null;
  const clientEmail = (row as any)?.client_email ?? (row as any)?.clientEmail ?? null;

  return {
    ...(row as Record<string, unknown>),
    orgId: (row as any)?.org_id ?? (row as any)?.orgId ?? "",
    orgName,
    organization,
    client_name: clientName,
    client_phone: clientPhone,
    client_email: clientEmail,
    clientName,
    clientPhone,
    clientEmail,
  } as DbDeal;
}

export function extractContactFromDeal(deal?: DbDeal | null): DealContact | null {
  if (!deal) return null;

  const payloadContact = extractContactFromPayload(deal.payload ?? null);
  if (payloadContact) return payloadContact;

  return normalizeContact({
    name: (deal as any)?.client_name ?? (deal as any)?.clientName,
    phone: (deal as any)?.client_phone ?? (deal as any)?.clientPhone,
    email: (deal as any)?.client_email ?? (deal as any)?.clientEmail,
  });
}

export const EMPTY_NEW_DEAL_FORM: Readonly<NewDealFormState> = Object.freeze({
  clientName: "",
  clientPhone: "",
  clientEmail: "",
  propertyStreet: "",
  propertyCity: "",
  propertyState: "",
  propertyPostalCode: "",
});

export function createEmptyDealForm(): NewDealFormState {
  return { ...EMPTY_NEW_DEAL_FORM };
}

export function validateNewDealForm(values: NewDealFormState): string | null {
  const required: Array<[keyof NewDealFormState, string]> = [
    ["clientName", "Client name"],
    ["clientPhone", "Phone"],
    ["clientEmail", "Email"],
    ["propertyStreet", "Property street"],
    ["propertyCity", "Property city"],
    ["propertyState", "Property state"],
    ["propertyPostalCode", "Property ZIP"],
  ];

  for (const [key, label] of required) {
    const value = trimOrNull(values[key]);
    if (!value) return `${label} is required.`;
  }

  return null;
}

export function extractContactFromPayload(payload: unknown): DealContact | null {
  const contactSource = (payload as any)?.contact ?? (payload as any)?.client ?? null;
  const normalized = normalizeContact(contactSource);
  if (normalized) return normalized;

  return normalizeContact({
    name: (payload as any)?.client_name ?? (payload as any)?.clientName,
    phone: (payload as any)?.client_phone ?? (payload as any)?.clientPhone,
    email: (payload as any)?.client_email ?? (payload as any)?.clientEmail,
  });
}
