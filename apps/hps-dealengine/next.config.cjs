/** @type {import("next").NextConfig} */
// Force Next trace output into distDir to avoid writing .next/trace (can be locked on Windows)
process.env.NEXT_PRIVATE_OUTPUT_TRACE = ".next-build/trace";
const baseConfig = {
  reactStrictMode: true,
  distDir: ".next-build",
  transpilePackages: ["@hps-internal/engine", "@hps-internal/contracts"],
};

module.exports = baseConfig;
