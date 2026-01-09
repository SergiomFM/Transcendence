import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: "standalone",

  // Disable React Strict Mode to prevent double-mounting issues with WebGL
  // React Strict Mode causes components to mount twice in development,
  // which creates multiple WebGL contexts and causes the uniformMatrix4fv error
  reactStrictMode: false,

  // Turbopack configuration for Next.js 16+
  turbopack: {},

  // Exclude Babylon.js from server-side bundling (it's client-only)
  serverExternalPackages: ["@babylonjs/core", "@babylonjs/gui"],

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
};

export default nextConfig;
