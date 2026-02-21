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

  async headers() {
    return [
      {
        // Disable caching for game-related assets (buttons, models)
        source: '/buttons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        ],
      },
      {
        source: '/models/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        ],
      },
      {
        // Allow short-term caching for fonts
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate',
          },
        ],
      },
    ];
  },

  async rewrites() {
    return [];
  },
};

export default withNextIntl(nextConfig);
