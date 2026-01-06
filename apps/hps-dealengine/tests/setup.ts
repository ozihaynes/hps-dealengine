/**
 * Vitest Setup
 *
 * Test setup and global utilities for the HPS DealEngine test suite.
 *
 * @module __tests__/setup
 * @version 1.0.0 (Slice 17 - Unit Tests)
 */

import { beforeAll, afterAll, vi } from "vitest";

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL TEST SETUP
// ═══════════════════════════════════════════════════════════════════════════

beforeAll(() => {
  // Mock console.error to keep test output clean
  // (comment out if you need to debug)
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// DATE MOCKING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mock the current date for deterministic time-based tests.
 *
 * @example
 * ```ts
 * const restore = mockDate(new Date('2024-06-15T12:00:00Z'));
 * // ... run tests ...
 * restore();
 * ```
 */
export function mockDate(date: Date): () => void {
  const originalDate = global.Date;
  const MockDate = class extends Date {
    constructor(...args: Parameters<typeof Date>) {
      if (args.length === 0) {
        super(date.getTime());
      } else {
        super(...args);
      }
    }

    static now(): number {
      return date.getTime();
    }
  };

  // @ts-expect-error - Replacing global Date
  global.Date = MockDate;

  return () => {
    global.Date = originalDate;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST DATA FACTORIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a unique test ID.
 */
let testIdCounter = 0;
export function testId(prefix = "test"): string {
  return `${prefix}-${++testIdCounter}`;
}

/**
 * Reset test ID counter between test suites if needed.
 */
export function resetTestIds(): void {
  testIdCounter = 0;
}
