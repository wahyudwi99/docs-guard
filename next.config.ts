import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export', // Disabled because NextAuth API routes are not compatible with static export.
  images: {
    unoptimized: true,
  },
  turbopack: {},
  transpilePackages: ['pdfjs-dist'],
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};

export default nextConfig;
