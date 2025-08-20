import type { NextConfig } from "next";

const skipBuildChecks = process.env.SKIP_BUILD_CHECKS === 'true';
const isCIBuild = process.env.CI === 'true';

const nextConfig: NextConfig = {
  serverExternalPackages: ['pino', 'pino-pretty'],
  images: {
    domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com', 'www.gravatar.com'],
  },
  eslint: {
    ignoreDuringBuilds: skipBuildChecks,
  },
  typescript: {
    // Only skip type errors on deploy builds when explicitly requested
    ignoreBuildErrors: skipBuildChecks,
  },
  // Use standalone output for optimized deployments
  output: isCIBuild ? 'standalone' : undefined,
};

export default nextConfig;
