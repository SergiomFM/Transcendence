import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack configuration for Next.js 16+
  turbopack: {},

  // Exclude Babylon.js from server-side bundling (it's client-only)
  serverExternalPackages: [
    "@babylonjs/core",
    "@babylonjs/gui",
    "@babylonjs/loaders",
  ],
};

export default nextConfig;
