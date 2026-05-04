import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  outputFileTracingIncludes: {
    "/*": ["./src/app/(tenant)/**/*"],
  },
  outputFileTracingExcludes: {
    "/*": ["./next.config.ts"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
