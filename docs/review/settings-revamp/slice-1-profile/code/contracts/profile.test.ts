import { describe, it, expect } from "vitest";
import {
  ProfileSchema,
  ProfileUpdateSchema,
  ProfileGetResponseSchema,
  TimezoneSchema,
  TIMEZONE_OPTIONS,
} from "./profile";

describe("ProfileSchema", () => {
  it("validates a complete profile", () => {
    const validProfile = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      display_name: "John Doe",
      avatar_url: "https://example.com/avatar.jpg",
      phone: "+1 (555) 123-4567",
      timezone: "America/New_York",
      created_at: "2026-01-07T12:00:00.000Z",
      updated_at: "2026-01-07T12:00:00.000Z",
    };
    expect(ProfileSchema.safeParse(validProfile).success).toBe(true);
  });

  it("accepts null values for optional fields", () => {
    const profileWithNulls = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      display_name: null,
      avatar_url: null,
      phone: null,
      timezone: "America/New_York",
      created_at: "2026-01-07T12:00:00.000Z",
      updated_at: "2026-01-07T12:00:00.000Z",
    };
    expect(ProfileSchema.safeParse(profileWithNulls).success).toBe(true);
  });

  it("rejects invalid UUID", () => {
    const invalidProfile = {
      id: "not-a-uuid",
      display_name: "Test",
      avatar_url: null,
      phone: null,
      timezone: "America/New_York",
      created_at: "2026-01-07T12:00:00.000Z",
      updated_at: "2026-01-07T12:00:00.000Z",
    };
    expect(ProfileSchema.safeParse(invalidProfile).success).toBe(false);
  });

  it("accepts profile with minimal timezone", () => {
    const minimalProfile = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      display_name: "Test",
      avatar_url: null,
      phone: null,
      timezone: "UTC",
      created_at: "2026-01-07T12:00:00.000Z",
      updated_at: "2026-01-07T12:00:00.000Z",
    };
    expect(ProfileSchema.safeParse(minimalProfile).success).toBe(true);
  });
});

describe("ProfileUpdateSchema", () => {
  it("validates display_name within limits", () => {
    expect(
      ProfileUpdateSchema.safeParse({ display_name: "John" }).success,
    ).toBe(true);
    expect(ProfileUpdateSchema.safeParse({ display_name: "A" }).success).toBe(
      true,
    );
    expect(
      ProfileUpdateSchema.safeParse({ display_name: "A".repeat(100) }).success,
    ).toBe(true);
  });

  it("rejects empty display_name (EC-1.2)", () => {
    expect(ProfileUpdateSchema.safeParse({ display_name: "" }).success).toBe(
      false,
    );
  });

  it("rejects display_name over 100 chars (EC-1.3)", () => {
    expect(
      ProfileUpdateSchema.safeParse({ display_name: "A".repeat(101) }).success,
    ).toBe(false);
  });

  it("validates phone format (EC-1.4)", () => {
    expect(
      ProfileUpdateSchema.safeParse({ phone: "+1 (555) 123-4567" }).success,
    ).toBe(true);
    expect(
      ProfileUpdateSchema.safeParse({ phone: "5551234567" }).success,
    ).toBe(true);
    expect(ProfileUpdateSchema.safeParse({ phone: null }).success).toBe(true);
    expect(ProfileUpdateSchema.safeParse({ phone: "" }).success).toBe(true);
  });

  it("rejects invalid phone format", () => {
    expect(ProfileUpdateSchema.safeParse({ phone: "abc" }).success).toBe(false);
    expect(ProfileUpdateSchema.safeParse({ phone: "123" }).success).toBe(false);
  });

  it("validates timezone from allowed list (EC-1.5)", () => {
    expect(
      ProfileUpdateSchema.safeParse({ timezone: "America/New_York" }).success,
    ).toBe(true);
    expect(ProfileUpdateSchema.safeParse({ timezone: "UTC" }).success).toBe(
      true,
    );
  });

  it("rejects invalid timezone", () => {
    expect(
      ProfileUpdateSchema.safeParse({ timezone: "Mars/Olympus" }).success,
    ).toBe(false);
    expect(ProfileUpdateSchema.safeParse({ timezone: "EST" }).success).toBe(
      false,
    );
  });

  it("allows partial updates", () => {
    expect(ProfileUpdateSchema.safeParse({}).success).toBe(true);
    expect(
      ProfileUpdateSchema.safeParse({ display_name: "Only Name" }).success,
    ).toBe(true);
  });

  it("validates combined updates", () => {
    expect(
      ProfileUpdateSchema.safeParse({
        display_name: "John Doe",
        phone: "+1 (555) 123-4567",
        timezone: "America/Chicago",
      }).success,
    ).toBe(true);
  });
});

describe("TimezoneSchema", () => {
  it("accepts all valid timezones", () => {
    const validTimezones = [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Phoenix",
      "UTC",
    ];
    validTimezones.forEach((tz) => {
      expect(TimezoneSchema.safeParse(tz).success).toBe(true);
    });
  });

  it("rejects invalid timezones", () => {
    const invalidTimezones = ["EST", "PST", "Europe/London", "Invalid"];
    invalidTimezones.forEach((tz) => {
      expect(TimezoneSchema.safeParse(tz).success).toBe(false);
    });
  });
});

describe("TIMEZONE_OPTIONS", () => {
  it("has all valid timezone values", () => {
    TIMEZONE_OPTIONS.forEach((opt) => {
      expect(TimezoneSchema.safeParse(opt.value).success).toBe(true);
    });
  });

  it("has labels for all options", () => {
    TIMEZONE_OPTIONS.forEach((opt) => {
      expect(opt.label).toBeTruthy();
      expect(typeof opt.label).toBe("string");
    });
  });
});

describe("ProfileGetResponseSchema", () => {
  it("validates complete response", () => {
    const response = {
      ok: true,
      profile: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        display_name: "John",
        avatar_url: null,
        phone: null,
        timezone: "America/New_York",
        created_at: "2026-01-07T12:00:00.000Z",
        updated_at: "2026-01-07T12:00:00.000Z",
      },
      email: "john@example.com",
      is_new: false,
    };
    expect(ProfileGetResponseSchema.safeParse(response).success).toBe(true);
  });

  it("validates is_new flag for new profiles (EC-1.1)", () => {
    const response = {
      ok: true,
      profile: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        display_name: "newuser",
        avatar_url: null,
        phone: null,
        timezone: "America/New_York",
        created_at: "2026-01-07T12:00:00.000Z",
        updated_at: "2026-01-07T12:00:00.000Z",
      },
      email: "new@example.com",
      is_new: true,
    };
    const result = ProfileGetResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_new).toBe(true);
    }
  });

  it("requires email field", () => {
    const response = {
      ok: true,
      profile: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        display_name: "John",
        avatar_url: null,
        phone: null,
        timezone: "America/New_York",
        created_at: "2026-01-07T12:00:00.000Z",
        updated_at: "2026-01-07T12:00:00.000Z",
      },
      is_new: false,
    };
    expect(ProfileGetResponseSchema.safeParse(response).success).toBe(false);
  });
});

describe("Edge case coverage", () => {
  it("handles whitespace in display_name", () => {
    // Single character is valid
    expect(
      ProfileUpdateSchema.safeParse({ display_name: " " }).success,
    ).toBe(true);
    expect(
      ProfileUpdateSchema.safeParse({ display_name: "  John  " }).success,
    ).toBe(true);
  });

  it("handles phone with various formats", () => {
    const validPhones = [
      "5551234567",
      "555-123-4567",
      "(555) 123-4567",
      "+1 555 123 4567",
      "1-555-123-4567",
    ];
    validPhones.forEach((phone) => {
      expect(ProfileUpdateSchema.safeParse({ phone }).success).toBe(true);
    });
  });

  it("handles exactly 100 character display_name (boundary)", () => {
    const exactly100 = "A".repeat(100);
    expect(
      ProfileUpdateSchema.safeParse({ display_name: exactly100 }).success,
    ).toBe(true);
  });

  it("rejects 101 character display_name (boundary)", () => {
    const tooLong = "A".repeat(101);
    expect(
      ProfileUpdateSchema.safeParse({ display_name: tooLong }).success,
    ).toBe(false);
  });
});
