import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@europmade/ui", "@europmade/utils", "@europmade/types"],
};

export default nextConfig;
