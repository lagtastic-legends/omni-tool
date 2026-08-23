import type { NextConfig } from "next";

/**
 * OMNI TOOL — Next.js configuration
 *
 * Cross-Origin Isolation is REQUIRED for SharedArrayBuffer, which powers
 * multi-threaded WebAssembly (ffmpeg.wasm MT cores). The headers below turn
 * the entire origin into a cross-origin isolated context:
 *
 *  - Cross-Origin-Opener-Policy: same-origin  → detaches the window opener
 *  - Cross-Origin-Embedder-Policy: require-corp → forces CORP on subresources
 *
 * All FFmpeg assets are self-hosted from /public/ffmpeg (same-origin), so
 * `require-corp` never blocks engine assets. The single-threaded core
 * (@ffmpeg/core) is additionally resilient: it boots even if a proxy strips
 * these headers.
 */
const COOP_COEP_HEADERS = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["*.space-z.ai", "localhost", "127.0.0.1"],
  async headers() {
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
