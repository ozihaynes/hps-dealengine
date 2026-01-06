/**
 * Edge Function Test Utilities
 *
 * Mock utilities and helpers for testing Supabase Edge Functions.
 * These provide deterministic test data and mock implementations
 * for integration testing without hitting real infrastructure.
 *
 * @module tests/edge-functions/test-utils
 * @version 1.0.0 (Slice 18 - Integration Tests)
 */

import { vi } from "vitest";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface MockUser {
  id: string;
  email: string;
  role: "authenticated" | "anon" | "service_role";
  org_id?: string;
}

export interface MockDeal {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  org_id: string;
}

export interface MockSnapshot {
  id: string;
  deal_id: string;
  run_id: string | null;
  snapshot_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface MockRun {
  id: string;
  deal_id: string;
  status: "pending" | "running" | "completed" | "failed";
  outputs: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
  created_by: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST DATA FACTORIES
// ═══════════════════════════════════════════════════════════════════════════

let idCounter = 0;

/**
 * Generate a unique test UUID.
 */
export function testUuid(prefix = "test"): string {
  idCounter++;
  return `${prefix}-${idCounter.toString().padStart(4, "0")}-uuid-mock`;
}

/**
 * Reset ID counter between test suites.
 */
export function resetTestIds(): void {
  idCounter = 0;
}

/**
 * Create a mock user for testing.
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: testUuid("user"),
    email: "test@example.com",
    role: "authenticated",
    org_id: testUuid("org"),
    ...overrides,
  };
}

/**
 * Create a mock deal for testing.
 */
export function createMockDeal(overrides: Partial<MockDeal> = {}): MockDeal {
  const now = new Date().toISOString();
  return {
    id: testUuid("deal"),
    address: "123 Test Street",
    city: "Orlando",
    state: "FL",
    zip: "32801",
    status: "active",
    created_at: now,
    updated_at: now,
    user_id: testUuid("user"),
    org_id: testUuid("org"),
    ...overrides,
  };
}

/**
 * Create a mock snapshot for testing.
 */
export function createMockSnapshot(overrides: Partial<MockSnapshot> = {}): MockSnapshot {
  const now = new Date().toISOString();
  return {
    id: testUuid("snapshot"),
    deal_id: testUuid("deal"),
    run_id: null,
    snapshot_data: {
      closeability_index: 75,
      urgency_score: 50,
      risk_adjusted_spread: 25000,
      buyer_demand_index: 65,
      verdict: "HOLD",
      confidence_grade: "B",
    },
    created_at: now,
    updated_at: now,
    created_by: testUuid("user"),
    ...overrides,
  };
}

/**
 * Create a mock run for testing.
 */
export function createMockRun(overrides: Partial<MockRun> = {}): MockRun {
  const now = new Date().toISOString();
  return {
    id: testUuid("run"),
    deal_id: testUuid("deal"),
    status: "completed",
    outputs: {
      closeability_index: 75,
      urgency_score: 50,
      risk_adjusted_spread: 25000,
      buyer_demand_index: 65,
      arv: 350000,
      mao_cash: 245000,
      mao_creative: 280000,
    },
    created_at: now,
    completed_at: now,
    created_by: testUuid("user"),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MOCK SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════════════════════

export interface MockSupabaseResponse<T> {
  data: T | null;
  error: { message: string; code: string } | null;
}

export interface MockQueryBuilder<T> {
  select: (columns?: string) => MockQueryBuilder<T>;
  insert: (data: Partial<T> | Partial<T>[]) => MockQueryBuilder<T>;
  update: (data: Partial<T>) => MockQueryBuilder<T>;
  delete: () => MockQueryBuilder<T>;
  eq: (column: string, value: unknown) => MockQueryBuilder<T>;
  neq: (column: string, value: unknown) => MockQueryBuilder<T>;
  gt: (column: string, value: unknown) => MockQueryBuilder<T>;
  gte: (column: string, value: unknown) => MockQueryBuilder<T>;
  lt: (column: string, value: unknown) => MockQueryBuilder<T>;
  lte: (column: string, value: unknown) => MockQueryBuilder<T>;
  is: (column: string, value: unknown) => MockQueryBuilder<T>;
  in: (column: string, values: unknown[]) => MockQueryBuilder<T>;
  order: (column: string, options?: { ascending?: boolean }) => MockQueryBuilder<T>;
  limit: (count: number) => MockQueryBuilder<T>;
  single: () => Promise<MockSupabaseResponse<T>>;
  maybeSingle: () => Promise<MockSupabaseResponse<T | null>>;
  then: <R>(
    onfulfilled?: (value: MockSupabaseResponse<T[]>) => R
  ) => Promise<R>;
}

/**
 * Create a mock Supabase query builder.
 */
export function createMockQueryBuilder<T>(
  mockData: T | T[] | null = null,
  mockError: { message: string; code: string } | null = null
): MockQueryBuilder<T> {
  const builder: MockQueryBuilder<T> = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    eq: () => builder,
    neq: () => builder,
    gt: () => builder,
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    is: () => builder,
    in: () => builder,
    order: () => builder,
    limit: () => builder,
    single: async () => ({
      data: Array.isArray(mockData) ? mockData[0] ?? null : mockData,
      error: mockError,
    }),
    maybeSingle: async () => ({
      data: Array.isArray(mockData) ? mockData[0] ?? null : mockData,
      error: mockError,
    }),
    then: async <R>(onfulfilled?: (value: MockSupabaseResponse<T[]>) => R): Promise<R> => {
      const result: MockSupabaseResponse<T[]> = {
        data: mockData === null ? null : (Array.isArray(mockData) ? mockData : [mockData]),
        error: mockError,
      };
      if (onfulfilled) {
        return onfulfilled(result);
      }
      return result as unknown as R;
    },
  };
  return builder;
}

/**
 * Create a mock Supabase client for testing.
 */
export function createMockSupabaseClient(options: {
  user?: MockUser | null;
  deals?: MockDeal[];
  snapshots?: MockSnapshot[];
  runs?: MockRun[];
  shouldError?: boolean;
  errorMessage?: string;
} = {}) {
  const {
    user = createMockUser(),
    deals = [],
    snapshots = [],
    runs = [],
    shouldError = false,
    errorMessage = "Mock error",
  } = options;

  const error = shouldError ? { message: errorMessage, code: "MOCK_ERROR" } : null;

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: user ? { user } : null },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      switch (table) {
        case "deals":
          return createMockQueryBuilder(error ? null : deals, error);
        case "dashboard_snapshots":
          return createMockQueryBuilder(error ? null : snapshots, error);
        case "runs":
          return createMockQueryBuilder(error ? null : runs, error);
        default:
          return createMockQueryBuilder(null, { message: `Unknown table: ${table}`, code: "UNKNOWN_TABLE" });
      }
    }),
    rpc: vi.fn().mockResolvedValue({
      data: null,
      error,
    }),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST/RESPONSE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a mock HTTP request for Edge Function testing.
 */
export function createMockRequest(options: {
  method?: string;
  path?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  searchParams?: Record<string, string>;
} = {}): Request {
  const {
    method = "GET",
    path = "/",
    body,
    headers = {},
    searchParams = {},
  } = options;

  const url = new URL(`https://example.com${path}`);
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const requestInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body && method !== "GET") {
    requestInit.body = JSON.stringify(body);
  }

  return new Request(url.toString(), requestInit);
}

/**
 * Parse a Response object for testing.
 */
export async function parseResponse<T = unknown>(response: Response): Promise<{
  status: number;
  ok: boolean;
  data: T | null;
  error: string | null;
}> {
  const status = response.status;
  const ok = response.ok;
  
  let data: T | null = null;
  let error: string | null = null;

  try {
    const json = await response.json();
    if (json.error) {
      error = json.error;
    } else {
      data = json as T;
    }
  } catch {
    // Response might not be JSON
    const text = await response.text();
    if (!ok) {
      error = text || "Unknown error";
    }
  }

  return { status, ok, data, error };
}

// ═══════════════════════════════════════════════════════════════════════════
// JWT HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a mock JWT token for testing.
 * NOTE: This is NOT a real JWT - just a mock for testing auth headers.
 */
export function createMockJwt(user: MockUser): string {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    org_id: user.org_id,
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  };
  
  // Base64 encode (not a real JWT signature)
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  const signature = btoa("mock-signature");
  
  return `${header}.${body}.${signature}`;
}

/**
 * Create authorization headers with mock JWT.
 */
export function createAuthHeaders(user: MockUser): Record<string, string> {
  return {
    Authorization: `Bearer ${createMockJwt(user)}`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ASSERTION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Assert that a response is a successful JSON response.
 */
export function assertSuccessResponse(response: Response): void {
  if (!response.ok) {
    throw new Error(`Expected success response, got ${response.status}`);
  }
  const contentType = response.headers.get("Content-Type");
  if (!contentType?.includes("application/json")) {
    throw new Error(`Expected JSON response, got ${contentType}`);
  }
}

/**
 * Assert that a response is an error with expected status.
 */
export function assertErrorResponse(response: Response, expectedStatus: number): void {
  if (response.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
  }
}

/**
 * Assert that an object has required fields.
 */
export function assertHasFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): void {
  for (const field of fields) {
    if (!(field in obj)) {
      throw new Error(`Missing required field: ${String(field)}`);
    }
  }
}
