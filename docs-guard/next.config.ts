import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  webpack: (config, { isServer }) => {
    // This is required to make pdfjs-dist work in Next.js
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};

export default nextConfig;
