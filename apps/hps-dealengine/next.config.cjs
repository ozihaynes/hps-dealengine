/** @type {import("next").NextConfig} */
const baseConfig = {
  reactStrictMode: true,
  distDir: ".next-build",
  transpilePackages: ["@hps-internal/engine", "@hps-internal/contracts"],
};

module.exports = baseConfig;
