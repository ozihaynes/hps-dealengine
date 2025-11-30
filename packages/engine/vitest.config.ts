import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.ts"],
    environment: "node",
    reporters: ["default"],
    coverage: {
      provider: "v8",
      reports: ["text", "lcov"]
    }
  }
});
