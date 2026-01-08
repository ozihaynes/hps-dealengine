/**
 * Excellence Layer Tests — Slice 5
 *
 * Tests for ErrorBoundary, HelpTooltip, and HelpText components.
 * Uses assertions compatible with vitest/node environment.
 *
 * @module tests/excellence
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ErrorBoundary, withErrorBoundary } from "@/components/ErrorBoundary";

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL MOCKS
// ═══════════════════════════════════════════════════════════════════════════

// Mock window for ErrorBoundary reload test
const windowMock = {
  location: {
    reload: vi.fn(),
  },
};

// @ts-expect-error - Mocking global
global.window = windowMock;

// ═══════════════════════════════════════════════════════════════════════════
// ERROR BOUNDARY TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("ErrorBoundary", () => {
  // Suppress console.error for expected errors
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
      throw new Error("Test error");
    }
    return <div data-testid="normal-content">Normal content</div>;
  };

  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByTestId("normal-content")).toBeTruthy();
    expect(screen.getByText("Normal content")).toBeTruthy();
  });

  it("renders fallback UI when error occurs", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByTestId("error-boundary-fallback")).toBeTruthy();
  });

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom-error">Custom error UI</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByTestId("custom-error")).toBeTruthy();
    expect(screen.getByText("Custom error UI")).toBeTruthy();
  });

  it("calls onError callback when error occurs", () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it("resets error state when Try Again is clicked", async () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeTruthy();

    // Click Try Again
    fireEvent.click(screen.getByTestId("error-retry-button"));

    // Re-render with non-throwing component
    rerender(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Normal content")).toBeTruthy();
  });

  it("resets error state when resetKey changes", () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="key1">
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeTruthy();

    // Change resetKey - should reset error state
    rerender(
      <ErrorBoundary resetKey="key2">
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Normal content")).toBeTruthy();
  });

  it("has accessible role and aria attributes", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    const alert = screen.getByRole("alert");
    expect(alert).toBeTruthy();
    expect(alert.getAttribute("aria-live")).toBe("assertive");
  });

  it("has min-h-44px touch targets on buttons", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    const retryButton = screen.getByTestId("error-retry-button");
    const reloadButton = screen.getByTestId("error-reload-button");

    // Check class contains min-h-[44px]
    expect(retryButton.className).toContain("min-h-[44px]");
    expect(reloadButton.className).toContain("min-h-[44px]");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// withErrorBoundary HOC TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("withErrorBoundary HOC", () => {
  // Suppress console.error for expected errors
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it("wraps component with ErrorBoundary", () => {
    const TestComponent = () => <div data-testid="test-content">Test content</div>;
    const WrappedComponent = withErrorBoundary(TestComponent);

    render(<WrappedComponent />);
    expect(screen.getByTestId("test-content")).toBeTruthy();
    expect(screen.getByText("Test content")).toBeTruthy();
  });

  it("sets correct displayName", () => {
    const TestComponent = () => <div>Test</div>;
    TestComponent.displayName = "TestComponent";
    const WrappedComponent = withErrorBoundary(TestComponent);

    expect(WrappedComponent.displayName).toBe("withErrorBoundary(TestComponent)");
  });

  it("uses component name when displayName not set", () => {
    function NamedComponent() {
      return <div>Test</div>;
    }
    const WrappedComponent = withErrorBoundary(NamedComponent);

    expect(WrappedComponent.displayName).toBe("withErrorBoundary(NamedComponent)");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPTEXT TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("HelpText", () => {
  it("renders icon variant with 44px touch target (w-11 h-11 classes)", async () => {
    const { HelpText } = await import("@/components/ui/HelpText");
    render(<HelpText>Help content</HelpText>);

    const button = screen.getByRole("button");
    expect(button).toBeTruthy();
    expect(button.className).toContain("w-11");
    expect(button.className).toContain("h-11");
  });

  it("renders inline variant with role=note", async () => {
    const { HelpText } = await import("@/components/ui/HelpText");
    render(<HelpText variant="inline">Inline help</HelpText>);

    const note = screen.getByRole("note");
    expect(note).toBeTruthy();
    expect(note.textContent).toBe("Inline help");
  });

  it("renders text variant with role=note", async () => {
    const { HelpText } = await import("@/components/ui/HelpText");
    render(<HelpText variant="text">Text help</HelpText>);

    const note = screen.getByRole("note");
    expect(note).toBeTruthy();
    expect(note.textContent).toBe("Text help");
  });

  it("icon button has accessible label", async () => {
    const { HelpText } = await import("@/components/ui/HelpText");
    render(<HelpText>Help content</HelpText>);

    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toBe("Help information");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// LABELWITHHELP TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("LabelWithHelp", () => {
  it("renders label with htmlFor attribute", async () => {
    const { LabelWithHelp } = await import("@/components/ui/HelpText");
    render(<LabelWithHelp label="Name" htmlFor="name-input" />);

    const label = screen.getByText("Name").closest("label");
    expect(label).toBeTruthy();
    expect(label?.getAttribute("for")).toBe("name-input");
  });

  it("shows required indicator with asterisk", async () => {
    const { LabelWithHelp } = await import("@/components/ui/HelpText");
    render(<LabelWithHelp label="Name" required />);

    expect(screen.getByText("*")).toBeTruthy();
    // Check screen reader text
    expect(screen.getByText("(required)")).toBeTruthy();
    expect(screen.getByText("(required)").className).toContain("sr-only");
  });

  it("shows help icon when help is provided", async () => {
    const { LabelWithHelp } = await import("@/components/ui/HelpText");
    render(<LabelWithHelp label="Name" help="Enter your full name" />);

    const button = screen.getByRole("button");
    expect(button).toBeTruthy();
  });

  it("does not show help icon when help is not provided", async () => {
    const { LabelWithHelp } = await import("@/components/ui/HelpText");
    render(<LabelWithHelp label="Name" />);

    expect(screen.queryByRole("button")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPTOOLTIP TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("HelpTooltip", () => {
  it("shows tooltip on hover", async () => {
    const { HelpTooltip } = await import("@/components/ui/HelpTooltip");
    render(
      <HelpTooltip content="Tooltip content">
        <button data-testid="trigger">Trigger</button>
      </HelpTooltip>
    );

    const trigger = screen.getByTestId("trigger");
    fireEvent.mouseEnter(trigger.parentElement!);

    // Wait for delay
    await waitFor(
      () => {
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toBeTruthy();
        expect(tooltip.textContent).toContain("Tooltip content");
      },
      { timeout: 500 }
    );
  });

  it("hides tooltip on mouse leave", async () => {
    const { HelpTooltip } = await import("@/components/ui/HelpTooltip");
    render(
      <HelpTooltip content="Tooltip content" delay={0}>
        <button data-testid="trigger">Trigger</button>
      </HelpTooltip>
    );

    const trigger = screen.getByTestId("trigger");
    fireEvent.mouseEnter(trigger.parentElement!);

    await waitFor(
      () => {
        expect(screen.getByRole("tooltip")).toBeTruthy();
      },
      { timeout: 100 }
    );

    fireEvent.mouseLeave(trigger.parentElement!);

    await waitFor(
      () => {
        expect(screen.queryByRole("tooltip")).toBeNull();
      },
      { timeout: 200 }
    );
  });

  it("uses z-40 class (below toasts)", async () => {
    const { HelpTooltip } = await import("@/components/ui/HelpTooltip");
    render(
      <HelpTooltip content="Content" delay={0}>
        <button data-testid="trigger">Trigger</button>
      </HelpTooltip>
    );

    fireEvent.mouseEnter(screen.getByTestId("trigger").parentElement!);

    await waitFor(
      () => {
        const tooltip = screen.getByRole("tooltip");
        const tooltipContainer = tooltip.parentElement;
        expect(tooltipContainer?.className).toContain("z-40");
      },
      { timeout: 100 }
    );
  });

  it("does not show tooltip when disabled", async () => {
    const { HelpTooltip } = await import("@/components/ui/HelpTooltip");
    render(
      <HelpTooltip content="Content" disabled delay={0}>
        <button data-testid="trigger">Trigger</button>
      </HelpTooltip>
    );

    fireEvent.mouseEnter(screen.getByTestId("trigger").parentElement!);

    // Wait a bit and verify tooltip doesn't appear
    await new Promise((r) => setTimeout(r, 100));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shows tooltip on focus (keyboard accessibility)", async () => {
    const { HelpTooltip } = await import("@/components/ui/HelpTooltip");
    render(
      <HelpTooltip content="Tooltip content" delay={0}>
        <button data-testid="trigger">Trigger</button>
      </HelpTooltip>
    );

    const trigger = screen.getByTestId("trigger");
    fireEvent.focus(trigger.parentElement!);

    await waitFor(
      () => {
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toBeTruthy();
        expect(tooltip.textContent).toContain("Tooltip content");
      },
      { timeout: 100 }
    );
  });
});
