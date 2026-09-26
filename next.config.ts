import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

/**
 * OMNI TOOL — Next.js configuration
 *
 * Two build targets share this file:
 *
 *  DEV / WEB (default)
 *    `output: "standalone"` + COOP/COEP headers for cross-origin isolation
 *    (SharedArrayBuffer, multi-threaded WASM readiness).
 *
 *  MOBILE EXPORT (MOBILE_EXPORT=1 — see scripts/build-mobile.sh)
 *    `output: "export"` produces `out/` which Capacitor wraps into the
 *    Android shell. Custom headers are meaningless in a static bundle,
 *    so they are dropped in that mode.
 */

const COOP_COEP_HEADERS = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
];

const isMobileExport = process.env.MOBILE_EXPORT === "1";

// Ensure YouTube API routes have the correct literal dynamic export for the target environment
const targetDynamic = isMobileExport ? '"force-static"' : '"force-dynamic"';
const apiRoutesToSync = [
  path.join(process.cwd(), "src/app/api/youtube/info/route.ts"),
  path.join(process.cwd(), "src/app/api/youtube/stream/route.ts"),
];

for (const filePath of apiRoutesToSync) {
  try {
    if (fs.existsSync(filePath)) {
      const code = fs.readFileSync(filePath, "utf8");
      const updatedCode = code.replace(
        /export const dynamic = ("force-static"|"force-dynamic");/,
        `export const dynamic = ${targetDynamic};`
      );
      if (updatedCode !== code) {
        fs.writeFileSync(filePath, updatedCode, "utf8");
      }
    }
  } catch {}
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_MOBILE_EXPORT: process.env.MOBILE_EXPORT || "",
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCgMmIHw2s_W6ldWtPmnXTi_YdehNHKzN4",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "omni-tool-7ba2d.firebaseapp.com",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "omni-tool-7ba2d",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "omni-tool-7ba2d.firebasestorage.app",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1006411301114",
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1006411301114:web:956666ec5eda39b225c943",
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  devIndicators: false,
  output: isMobileExport ? "export" : "standalone",
  images: { unoptimized: true },
  trailingSlash: true,
  async headers() {
    if (isMobileExport) return [];
    return [
      {
        source: "/zenodeck.mobileconfig",
        headers: [
          {
            key: "Content-Type",
            value: "application/x-apple-aspen-config; charset=utf-8",
          },
          {
            key: "Content-Disposition",
            value: 'attachment; filename="zenodeck.mobileconfig"',
          },
        ],
      },
    ];
  },
  async rewrites() {
    if (isMobileExport) return [];
    return [
      {
        source: "/__/auth/:path*",
        destination: "https://omni-tool-7ba2d.firebaseapp.com/__/auth/:path*",
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
