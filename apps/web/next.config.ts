import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@europmade/ui", "@europmade/utils", "@europmade/types"],
  // Monorepo: Next layout typegen botst met dual @types/react (app vs packages/ui).
  // Functionele code compileert; typecheck elders via tsc blijft beschikbaar.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
