/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@casita/shared", "@casita/api-client"]
};

export default nextConfig;
