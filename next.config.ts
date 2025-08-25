import type { NextConfig } from 'next';

const skipBuildChecks = process.env.SKIP_BUILD_CHECKS === 'true';

const nextConfig: NextConfig = {
  serverExternalPackages: ['pino', 'pino-pretty'],
  images: {
    remotePatterns: [
      {
        hostname: 'lh3.googleusercontent.com',
      },
      {
        hostname: 'avatars.githubusercontent.com',
      },
      {
        hostname: 'www.gravatar.com',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: skipBuildChecks,
  },
  typescript: {
    // Only skip type errors on deploy builds when explicitly requested
    ignoreBuildErrors: skipBuildChecks,
  },
  experimental: {
    reactCompiler: true,
  },
};

export default nextConfig;
