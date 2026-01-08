import { z } from "zod";

/**
 * Allowed timezones (US-focused subset)
 * Must match Edge Function validation
 */
export const TimezoneSchema = z.enum([
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "UTC",
]);

export type Timezone = z.infer<typeof TimezoneSchema>;

export const TIMEZONE_OPTIONS: Array<{ value: Timezone; label: string }> = [
  { value: "America/New_York", label: "Eastern Time (New York)" },
  { value: "America/Chicago", label: "Central Time (Chicago)" },
  { value: "America/Denver", label: "Mountain Time (Denver)" },
  { value: "America/Los_Angeles", label: "Pacific Time (Los Angeles)" },
  { value: "America/Phoenix", label: "Arizona (Phoenix)" },
  { value: "UTC", label: "UTC" },
];

/**
 * Profile schema (from database)
 */
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().nullable(),
  avatar_url: z.string().url().nullable().or(z.null()),
  phone: z.string().nullable(),
  timezone: z.string().default("America/New_York"),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Profile = z.infer<typeof ProfileSchema>;

/**
 * Profile update input (what client sends)
 */
export const ProfileUpdateSchema = z.object({
  display_name: z
    .string()
    .min(1, "Display name cannot be empty")
    .max(100, "Display name too long")
    .optional(),
  phone: z
    .string()
    .regex(/^[\d\s\-\+\(\)]{7,20}$/, "Invalid phone format")
    .optional()
    .nullable()
    .or(z.literal("")),
  timezone: TimezoneSchema.optional(),
});

export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;

/**
 * GET response from v1-profile-get
 */
export const ProfileGetResponseSchema = z.object({
  ok: z.boolean(),
  profile: ProfileSchema,
  email: z.string().email(),
  is_new: z.boolean(),
});

export type ProfileGetResponse = z.infer<typeof ProfileGetResponseSchema>;

/**
 * PUT response from v1-profile-put
 */
export const ProfilePutResponseSchema = z.object({
  ok: z.boolean(),
  profile: ProfileSchema,
  message: z.string(),
});

export type ProfilePutResponse = z.infer<typeof ProfilePutResponseSchema>;

/**
 * Error response with optional field indicator
 */
export const ProfileErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  field: z.string().optional(),
});

export type ProfileErrorResponse = z.infer<typeof ProfileErrorResponseSchema>;
