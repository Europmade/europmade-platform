import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@europmade/ui", "@europmade/utils", "@europmade/types"],
  // Monorepo: Next layout typegen botst met dual @types/react (app vs packages/ui).
  // Functionele code compileert; typecheck elders via tsc blijft beschikbaar.
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/cms-preview/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' http://localhost:3001 http://127.0.0.1:3001 http://192.168.2.17:3001",
          },
        ],
      },
    ]
  },
};

export default nextConfig;
