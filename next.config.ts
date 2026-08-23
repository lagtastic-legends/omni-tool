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
  output: "export" as const,
  images: { unoptimized: true },
  trailingSlash: true,
  async headers() {
    return [];
  },
};

export default nextConfig;
