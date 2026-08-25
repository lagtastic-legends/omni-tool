import type { CapacitorConfig } from "@capacitor/cli";

/**
 * OMNI TOOL — Capacitor configuration (Android).
 *
 * The web app is a single-canvas client-side SPA, which static-exports
 * cleanly into `out/` (see `scripts/build-mobile.sh`). The android/
 * platform project wraps that export in a native WebView shell with
 * camera permissions granted for the QR Studio scanner.
 */
const config: CapacitorConfig = {
  appId: "com.omnitool.app",
  appName: "Omni Tool",
  webDir: "out",
  android: {
    // WebView must reach getUserMedia for the QR scanner & Studio Recorder.
    allowMixedContent: false,
    webContentsDebuggingEnabled: true,
  },
  server: {
    androidScheme: "https",
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"],
      serverClientId: "1006411301114-q48l1fmvbiba3rq6u1s59qgl13c57sd1.apps.googleusercontent.com",
    },
  },
};

export default config;
