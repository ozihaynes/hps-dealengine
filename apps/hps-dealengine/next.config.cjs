/** @type {import("next").NextConfig} */
module.exports = {
  reactStrictMode: true,
  distDir: ".next-build",
  transpilePackages: ["@hps-internal/engine", "@hps-internal/contracts"],
};