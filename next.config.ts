import type { NextConfig } from "next";

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
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_MOBILE_EXPORT: process.env.MOBILE_EXPORT || "",
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  },
  reactStrictMode: true,
  devIndicators: false,
  output: isMobileExport ? "export" : "standalone",
  images: { unoptimized: true },
  trailingSlash: true,
  async headers() {
    if (isMobileExport) return [];
    return [
      {
        source: "/:path*",
        headers: COOP_COEP_HEADERS,
      },
    ];
  },
};

export default nextConfig;
