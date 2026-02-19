import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: "standalone",

  // Disable React Strict Mode to prevent double-mounting issues with WebGL
  // React Strict Mode causes components to mount twice in development,
  // which creates multiple WebGL contexts and causes the uniformMatrix4fv error
  reactStrictMode: false,

  // Turbopack configuration for Next.js 16+
  turbopack: {},

  // Webpack configuration for production builds
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ensure Babylon.js modules are only loaded on client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },

  async rewrites() {
    return [];
  },
};

export default withNextIntl(nextConfig);
