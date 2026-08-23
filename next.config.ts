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
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  ...(isMobileExport
    ? {
        output: "export" as const,
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {
        output: "standalone" as const,
        allowedDevOrigins: ["*.space-z.ai", "localhost", "127.0.0.1"],
      }),
  async headers() {
    if (isMobileExport) return [];
    return [
      {
        // Global cross-origin isolation for every route.
        source: "/(.*)",
        headers: COOP_COEP_HEADERS,
      },
      {
        // WASM core: long-lived immutable asset — cache aggressively.
        source: "/ffmpeg/:path*",
        headers: [
          ...COOP_COEP_HEADERS,
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
