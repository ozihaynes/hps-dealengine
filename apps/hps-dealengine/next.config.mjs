/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [\"@hps-internal/engine\", \"@hps-internal/contracts\"]
};
export default nextConfig;
