// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    environmentMatchGlobs: [
      ["apps/**", "jsdom"],
    ],
    include: [
      "packages/**/*.test.ts",
      "apps/**/*.test.ts",
      "supabase/functions/**/*.test.ts",
    ],
    // Use default reporter (fixes "Failed to load custom Reporter from basic")
    reporters: "default",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.next/**",
        "**/tests/**/fixtures/**",
      ],
    },
  },
});
