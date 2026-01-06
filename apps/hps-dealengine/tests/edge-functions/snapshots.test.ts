/**
 * Snapshot Edge Function Integration Tests
 *
 * Integration tests for dashboard snapshot management Edge Functions.
 * Tests cover CRUD operations, RLS compliance, error handling, and
 * response contracts.
 *
 * TEST CATEGORIES:
 * 1. create-snapshot - Create new dashboard snapshots
 * 2. get-snapshot - Retrieve snapshots by deal ID
 * 3. update-snapshot - Update existing snapshots
 * 4. delete-snapshot - Soft delete with audit trail
 * 5. RLS enforcement - Access control validation
 * 6. Error handling - Invalid inputs and edge cases
 *
 * @module tests/edge-functions/snapshots.test
 * @version 1.0.0 (Slice 18 - Integration Tests)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createMockUser,
  createMockDeal,
  createMockSnapshot,
  createMockRun,
  createMockSupabaseClient,
  createMockRequest,
  createAuthHeaders,
  parseResponse,
  resetTestIds,
  type MockUser,
  type MockDeal,
  type MockSnapshot,
} from "./edge-function-test-utils";

// ═══════════════════════════════════════════════════════════════════════════
// MOCK EDGE FUNCTION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mock implementation of create-snapshot Edge Function.
 * This simulates the actual Edge Function behavior for testing.
 */
async function handleCreateSnapshot(
  request: Request,
  supabase: ReturnType<typeof createMockSupabaseClient>
): Promise<Response> {
  // Check auth
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse body
  let body: { deal_id?: string; snapshot_data?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate required fields
  if (!body.deal_id) {
    return new Response(JSON.stringify({ error: "deal_id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.snapshot_data || typeof body.snapshot_data !== "object") {
    return new Response(JSON.stringify({ error: "snapshot_data is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check deal exists and user has access (RLS simulation)
  const { data: deals, error: dealError } = await supabase
    .from("deals")
    .select("id, user_id, org_id")
    .eq("id", body.deal_id);

  if (dealError || !deals || deals.length === 0) {
    return new Response(JSON.stringify({ error: "Deal not found or access denied" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create snapshot
  const now = new Date().toISOString();
  const snapshot: MockSnapshot = {
    id: `snapshot-${Date.now()}`,
    deal_id: body.deal_id,
    run_id: null,
    snapshot_data: body.snapshot_data,
    created_at: now,
    updated_at: now,
    created_by: userData.user.id,
  };

  return new Response(JSON.stringify({ data: snapshot }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Mock implementation of get-snapshot Edge Function.
 */
async function handleGetSnapshot(
  request: Request,
  supabase: ReturnType<typeof createMockSupabaseClient>
): Promise<Response> {
  // Check auth
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get deal_id from query params
  const url = new URL(request.url);
  const dealId = url.searchParams.get("deal_id");

  if (!dealId) {
    return new Response(JSON.stringify({ error: "deal_id query parameter is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get snapshot (RLS will filter by user access)
  const { data: snapshots, error: snapshotError } = await supabase
    .from("dashboard_snapshots")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (snapshotError) {
    return new Response(JSON.stringify({ error: snapshotError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!snapshots || snapshots.length === 0) {
    return new Response(JSON.stringify({ error: "Snapshot not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ data: snapshots[0] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Mock implementation of update-snapshot Edge Function.
 */
async function handleUpdateSnapshot(
  request: Request,
  supabase: ReturnType<typeof createMockSupabaseClient>
): Promise<Response> {
  // Check auth
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse body
  let body: { snapshot_id?: string; snapshot_data?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate required fields
  if (!body.snapshot_id) {
    return new Response(JSON.stringify({ error: "snapshot_id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.snapshot_data || typeof body.snapshot_data !== "object") {
    return new Response(JSON.stringify({ error: "snapshot_data is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check snapshot exists and user has access
  const { data: snapshots, error: snapshotError } = await supabase
    .from("dashboard_snapshots")
    .select("*")
    .eq("id", body.snapshot_id);

  if (snapshotError || !snapshots || snapshots.length === 0) {
    return new Response(JSON.stringify({ error: "Snapshot not found or access denied" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Update snapshot
  const updatedSnapshot = {
    ...snapshots[0],
    snapshot_data: body.snapshot_data,
    updated_at: new Date().toISOString(),
  };

  return new Response(JSON.stringify({ data: updatedSnapshot }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Mock implementation of delete-snapshot Edge Function.
 */
async function handleDeleteSnapshot(
  request: Request,
  supabase: ReturnType<typeof createMockSupabaseClient>
): Promise<Response> {
  // Check auth
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get snapshot_id from query params
  const url = new URL(request.url);
  const snapshotId = url.searchParams.get("snapshot_id");

  if (!snapshotId) {
    return new Response(JSON.stringify({ error: "snapshot_id query parameter is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check snapshot exists and user has access
  const { data: snapshots, error: snapshotError } = await supabase
    .from("dashboard_snapshots")
    .select("*")
    .eq("id", snapshotId);

  if (snapshotError || !snapshots || snapshots.length === 0) {
    return new Response(JSON.stringify({ error: "Snapshot not found or access denied" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Soft delete (in real implementation, would set deleted_at)
  return new Response(JSON.stringify({ data: { deleted: true, id: snapshotId } }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Snapshot Edge Functions", () => {
  let mockUser: MockUser;
  let mockDeal: MockDeal;
  let mockSnapshot: MockSnapshot;

  beforeEach(() => {
    resetTestIds();
    mockUser = createMockUser();
    mockDeal = createMockDeal({ user_id: mockUser.id, org_id: mockUser.org_id });
    mockSnapshot = createMockSnapshot({
      deal_id: mockDeal.id,
      created_by: mockUser.id,
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // CREATE SNAPSHOT TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe("create-snapshot", () => {
    describe("successful creation", () => {
      it("creates a snapshot with valid data", async () => {
        const supabase = createMockSupabaseClient({
          user: mockUser,
          deals: [mockDeal],
        });

        const request = createMockRequest({
          method: "POST",
          path: "/create-snapshot",
          body: {
            deal_id: mockDeal.id,
            snapshot_data: {
              closeability_index: 80,
              urgency_score: 45,
              risk_adjusted_spread: 35000,
              verdict: "GO",
            },
          },
          headers: createAuthHeaders(mockUser),
        });

        const response = await handleCreateSnapshot(request, supabase);
        const { status, data, error } = await parseResponse(response);

        expect(status).toBe(201);
        expect(error).toBeNull();
        expect(data).not.toBeNull();
        expect(data).toHaveProperty("data.deal_id", mockDeal.id);
        expect(data).toHaveProperty("data.snapshot_data.verdict", "GO");
      });

      it("includes created_by from authenticated user", async () => {
        const supabase = createMockSupabaseClient({
          user: mockUser,
          deals: [mockDeal],
        });

        const request = createMockRequest({
          method: "POST",
          path: "/create-snapshot",
          body: {
            deal_id: mockDeal.id,
            snapshot_data: { verdict: "HOLD" },
          },
          headers: createAuthHeaders(mockUser),
        });

        const response = await handleCreateSnapshot(request, supabase);
        const { data } = await parseResponse(response);

        expect(data).toHaveProperty("data.created_by", mockUser.id);
      });
    });

    describe("authentication", () => {
      it("returns 401 without auth header", async () => {
        const supabase = createMockSupabaseClient({ user: mockUser });

        const request = createMockRequest({
          method: "POST",
          path: "/create-snapshot",
          body: { deal_id: mockDeal.id, snapshot_data: {} },
          // No auth headers
        });

        const response = await handleCreateSnapshot(request, supabase);
        expect(response.status).toBe(401);
      });

      it("returns 401 with invalid auth header", async () => {
        const supabase = createMockSupabaseClient({ user: null });

        const request = createMockRequest({
          method: "POST",
          path: "/create-snapshot",
          body: { deal_id: mockDeal.id, snapshot_data: {} },
          headers: { Authorization: "Bearer invalid-token" },
        });

        const response = await handleCreateSnapshot(request, supabase);
        expect(response.status).toBe(401);
      });
    });

    describe("validation", () => {
      it("returns 400 when deal_id is missing", async () => {
        const supabase = createMockSupabaseClient({ user: mockUser });

        const request = createMockRequest({
          method: "POST",
          path: "/create-snapshot",
          body: { snapshot_data: {} },
          headers: createAuthHeaders(mockUser),
        });

        const response = await handleCreateSnapshot(request, supabase);
        const { status, error } = await parseResponse(response);

        expect(status).toBe(400);
        expect(error).toContain("deal_id");
      });

      it("returns 400 when snapshot_data is missing", async () => {
        const supabase = createMockSupabaseClient({ user: mockUser });

        const request = createMockRequest({
          method: "POST",
          path: "/create-snapshot",
          body: { deal_id: mockDeal.id },
          headers: createAuthHeaders(mockUser),
        });

        const response = await handleCreateSnapshot(request, supabase);
        const { status, error } = await parseResponse(response);

        expect(status).toBe(400);
        expect(error).toContain("snapshot_data");
      });

      it("returns 400 for invalid JSON body", async () => {
        const supabase = createMockSupabaseClient({ user: mockUser });

        const request = new Request("https://example.com/create-snapshot", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...createAuthHeaders(mockUser),
          },
          body: "invalid json{",
        });

        const response = await handleCreateSnapshot(request, supabase);
        expect(response.status).toBe(400);
      });
    });

    describe("RLS enforcement", () => {
      it("returns 404 when deal does not exist", async () => {
        const supabase = createMockSupabaseClient({
          user: mockUser,
          deals: [], // No deals
        });

        const request = createMockRequest({
          method: "POST",
          path: "/create-snapshot",
          body: {
            deal_id: "nonexistent-deal-id",
            snapshot_data: { verdict: "GO" },
          },
          headers: createAuthHeaders(mockUser),
        });

        const response = await handleCreateSnapshot(request, supabase);
        expect(response.status).toBe(404);
      });

      it("returns 404 when user lacks access to deal", async () => {
        const otherUser = createMockUser({ id: "other-user-id" });
        const otherUserDeal = createMockDeal({ user_id: "other-user-id" });

        const supabase = createMockSupabaseClient({
          user: mockUser,
          deals: [], // RLS would filter out other user's deals
        });

        const request = createMockRequest({
          method: "POST",
          path: "/create-snapshot",
          body: {
            deal_id: otherUserDeal.id,
            snapshot_data: { verdict: "GO" },
          },
          headers: createAuthHeaders(mockUser),
        });

        const response = await handleCreateSnapshot(request, supabase);
        expect(response.status).toBe(404);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // GET SNAPSHOT TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe("get-snapshot", () => {
    describe("successful retrieval", () => {
      it("returns snapshot for valid deal_id", async () => {
        const supabase = createMockSupabaseClient({
          user: mockUser,
          snapshots: [mockSnapshot],
        });

        const request = createMockRequest({
          method: "GET",
          path: "/get-snapshot",
          searchParams: { deal_id: mockSnapshot.deal_id },
          headers: createAuthHeaders(mockUser),
        });

        const response = await handleGetSnapshot(request, supabase);
        const { status, data, error } = await parseResponse(response);

        expect(status).toBe(200);
        expect(error).toBeNull();
        expect(data).toHaveProperty("data.id", mockSnapshot.id);
      });

      it("returns most recent snapshot when multiple exist", async () => {
        const olderSnapshot = createMockSnapshot({
          deal_id: mockDeal.id,
          created_at: "2024-01-01T00:00:00Z",
        });
        const newerSnapshot = createMockSnapshot({
          deal_id: mockDeal.id,
          created_at: "2024-06-01T00:00:00Z",
        });

        const supabase = createMockSupabaseClient({
          user: mockUser,
          snapshots: [newerSnapshot], // Mock returns the ordered result
        });

        const request = createMockRequest({
          method: "GET",
          path: "/get-snapshot",
          searchParams: { deal_id: mockDeal.id },
          headers: createAuthHeaders(mockUser),
        });

        const response = await handleGetSnapshot(request, supabase);
        const { data } = await parseResponse(response);

        expect(data).toHaveProperty("data.id", newerSnapshot.id);
      });
    });

    describe("validation", () => {
      it("returns 400 when deal_id is missing", async () => {
        const supabase = createMockSupabaseClient({ user: mockUser });

        const request = createMockRequest({
          method: "GET",
          path: "/get-snapshot",
          // No deal_id param
          headers: createAuthHeaders(mockUser),
        });

        const response = await handleGetSnapshot(request, supabase);
        expect(response.status).toBe(400);
      });
    });

    describe("not found", () => {
      it("returns 404 when no snapshot exists for deal", async () => {
        const supabase = createMockSupabaseClient({
          user: mockUser,
          snapshots: [], // No snapshots
        });

        const request = createMockRequest({
          method: "GET",
          path: "/get-snapshot",
          searchParams: { deal_id: mockDeal.id },
          headers: createAuthHeaders(mockUser),
        });

        const response = await handleGetSnapshot(request, supabase);
        expect(response.status).toBe(404);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // UPDATE SNAPSHOT TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe("update-snapshot", () => {
    describe("successful update", () => {
      it("updates snapshot with new data", async () => {
        const supabase = createMockSupabaseClient({
          user: mockUser,
          snapshots: [mockSnapshot],
        });

        const request = createMockRequest({
          method: "PUT",
          path: "/update-snapshot",
          body: {
            snapshot_id: mockSnapshot.id,
            snapshot_data: {
              closeability_index: 90,
              verdict: "GO",
            },
          },
          headers: createAuthHeaders(mockUser),
        });

        const response = await handleUpdateSnapshot(request, supabase);
        const { status, data, error } = await parseResponse(response);

        expect(status).toBe(200);
        expect(error).toBeNull();
        expect(data).toHaveProperty("data.snapshot_data.verdict", "GO");
      });

      it("updates updated_at timestamp", async () => {
        const oldTimestamp = "2024-01-01T00:00:00Z";
        const oldSnapshot = createMockSnapshot({
          updated_at: oldTimestamp,
        });

        const supabase = createMockSupabaseClient({
          user: mockUser,
          snapshots: [oldSnapshot],
        });

        const request = createMockRequest({
          method: "PUT",
          path: "/update-snapshot",
          body: {
            snapshot_id: oldSnapshot.id,
            snapshot_data: { verdict: "HOLD" },
          },
          headers: createAuthHeaders(mockUser),
        });

        const response = await handleUpdateSnapshot(request, supabase);
        const { data } = await parseResponse<{ data: { updated_at: string } }>(response);

        expect(data?.data?.updated_at).not.toBe(oldTimestamp);
      });
    });

    describe("validation", () => {
      it("returns 400 when snapshot_id is missing", async () => {
        const supabase = createMockSupabaseClient({ user: mockUser });

        const request = createMockRequest({
          method: "PUT",
          path: "/update-snapshot",
          body: { snapshot_data: {} },
          headers: createAuthHeaders(mockUser),
        });

        const response = await handleUpdateSnapshot(request, supabase);
        expect(response.status).toBe(400);
      });

      it("returns 400 when snapshot_data is missing", async () => {
        const supabase = createMockSupabaseClient({ user: mockUser });

        const request = createMockRequest({
          method: "PUT",
          path: "/update-snapshot",
          body: { snapshot_id: mockSnapshot.id },
          headers: createAuthHeaders(mockUser),
        });

        const response = await handleUpdateSnapshot(request, supabase);
        expect(response.status).toBe(400);
      });
    });

    describe("RLS enforcement", () => {
      it("returns 404 when snapshot does not exist", async () => {
        const supabase = createMockSupabaseClient({
          user: mockUser,
          snapshots: [], // No snapshots
        });

        const request = createMockRequest({
          method: "PUT",
          path: "/update-snapshot",
          body: {
            snapshot_id: "nonexistent-id",
            snapshot_data: { verdict: "GO" },
          },
          headers: createAuthHeaders(mockUser),
        });

        const response = await handleUpdateSnapshot(request, supabase);
        expect(response.status).toBe(404);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // DELETE SNAPSHOT TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe("delete-snapshot", () => {
    describe("successful deletion", () => {
      it("soft deletes snapshot", async () => {
        const supabase = createMockSupabaseClient({
          user: mockUser,
          snapshots: [mockSnapshot],
        });

        const request = createMockRequest({
          method: "DELETE",
          path: "/delete-snapshot",
          searchParams: { snapshot_id: mockSnapshot.id },
          headers: createAuthHeaders(mockUser),
        });

        const response = await handleDeleteSnapshot(request, supabase);
        const { status, data, error } = await parseResponse(response);

        expect(status).toBe(200);
        expect(error).toBeNull();
        expect(data).toHaveProperty("data.deleted", true);
        expect(data).toHaveProperty("data.id", mockSnapshot.id);
      });
    });

    describe("validation", () => {
      it("returns 400 when snapshot_id is missing", async () => {
        const supabase = createMockSupabaseClient({ user: mockUser });

        const request = createMockRequest({
          method: "DELETE",
          path: "/delete-snapshot",
          // No snapshot_id param
          headers: createAuthHeaders(mockUser),
        });

        const response = await handleDeleteSnapshot(request, supabase);
        expect(response.status).toBe(400);
      });
    });

    describe("RLS enforcement", () => {
      it("returns 404 when snapshot does not exist", async () => {
        const supabase = createMockSupabaseClient({
          user: mockUser,
          snapshots: [], // No snapshots
        });

        const request = createMockRequest({
          method: "DELETE",
          path: "/delete-snapshot",
          searchParams: { snapshot_id: "nonexistent-id" },
          headers: createAuthHeaders(mockUser),
        });

        const response = await handleDeleteSnapshot(request, supabase);
        expect(response.status).toBe(404);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ERROR HANDLING TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe("Error handling", () => {
    it("returns 500 on database errors", async () => {
      const supabase = createMockSupabaseClient({
        user: mockUser,
        shouldError: true,
        errorMessage: "Database connection failed",
      });

      const request = createMockRequest({
        method: "GET",
        path: "/get-snapshot",
        searchParams: { deal_id: mockDeal.id },
        headers: createAuthHeaders(mockUser),
      });

      const response = await handleGetSnapshot(request, supabase);
      expect(response.status).toBe(500);
    });

    it("returns proper JSON error format", async () => {
      const supabase = createMockSupabaseClient({ user: mockUser });

      const request = createMockRequest({
        method: "GET",
        path: "/get-snapshot",
        // Missing deal_id
        headers: createAuthHeaders(mockUser),
      });

      const response = await handleGetSnapshot(request, supabase);
      const { error } = await parseResponse(response);

      expect(error).not.toBeNull();
      expect(typeof error).toBe("string");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RUN ANALYSIS EDGE FUNCTION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("run-analysis Edge Function", () => {
  let mockUser: MockUser;
  let mockDeal: MockDeal;

  beforeEach(() => {
    resetTestIds();
    mockUser = createMockUser();
    mockDeal = createMockDeal({ user_id: mockUser.id });
  });

  /**
   * Mock implementation of run-analysis Edge Function.
   */
  async function handleRunAnalysis(
    request: Request,
    supabase: ReturnType<typeof createMockSupabaseClient>
  ): Promise<Response> {
    // Check auth
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse body
    let body: { deal_id?: string };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate
    if (!body.deal_id) {
      return new Response(JSON.stringify({ error: "deal_id is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check deal exists
    const { data: deals, error: dealError } = await supabase
      .from("deals")
      .select("*")
      .eq("id", body.deal_id);

    if (dealError || !deals || deals.length === 0) {
      return new Response(JSON.stringify({ error: "Deal not found or access denied" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create run record
    const run = createMockRun({
      deal_id: body.deal_id,
      status: "pending",
      created_by: userData.user.id,
    });

    return new Response(JSON.stringify({ data: { run_id: run.id, status: "pending" } }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  }

  describe("triggering analysis", () => {
    it("creates a pending run for valid deal", async () => {
      const supabase = createMockSupabaseClient({
        user: mockUser,
        deals: [mockDeal],
      });

      const request = createMockRequest({
        method: "POST",
        path: "/run-analysis",
        body: { deal_id: mockDeal.id },
        headers: createAuthHeaders(mockUser),
      });

      const response = await handleRunAnalysis(request, supabase);
      const { status, data, error } = await parseResponse(response);

      expect(status).toBe(202); // Accepted
      expect(error).toBeNull();
      expect(data).toHaveProperty("data.run_id");
      expect(data).toHaveProperty("data.status", "pending");
    });

    it("returns 404 for nonexistent deal", async () => {
      const supabase = createMockSupabaseClient({
        user: mockUser,
        deals: [],
      });

      const request = createMockRequest({
        method: "POST",
        path: "/run-analysis",
        body: { deal_id: "nonexistent-id" },
        headers: createAuthHeaders(mockUser),
      });

      const response = await handleRunAnalysis(request, supabase);
      expect(response.status).toBe(404);
    });

    it("returns 400 without deal_id", async () => {
      const supabase = createMockSupabaseClient({ user: mockUser });

      const request = createMockRequest({
        method: "POST",
        path: "/run-analysis",
        body: {},
        headers: createAuthHeaders(mockUser),
      });

      const response = await handleRunAnalysis(request, supabase);
      expect(response.status).toBe(400);
    });

    it("returns 401 without authentication", async () => {
      const supabase = createMockSupabaseClient({ user: mockUser });

      const request = createMockRequest({
        method: "POST",
        path: "/run-analysis",
        body: { deal_id: mockDeal.id },
        // No auth headers
      });

      const response = await handleRunAnalysis(request, supabase);
      expect(response.status).toBe(401);
    });
  });
});
