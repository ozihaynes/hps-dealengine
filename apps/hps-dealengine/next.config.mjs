/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { esmExternals: "loose" },
  transpilePackages: ["@hps-internal/engine"],
};
export default nextConfig;
