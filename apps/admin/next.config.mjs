/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@neighbr/shared-config", "@neighbr/api-types", "@neighbr/validation"],
};

export default nextConfig;
