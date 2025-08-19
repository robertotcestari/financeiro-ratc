import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pino', 'pino-pretty'],
  images: {
    domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com', 'www.gravatar.com'],
  },
};

export default nextConfig;
