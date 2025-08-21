import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // optional: also skip TS errors if you want zero-blocking builds
  // typescript: { ignoreBuildErrors: true },
};

export default nextConfig;