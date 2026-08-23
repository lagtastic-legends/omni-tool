"use client";

/**
 * OMNI TOOL — Phase 5: File Management, Recording & Dashboard
 * ---------------------------------------------------
 * Single-canvas SPA ("/"). FFmpegEngineProvider powers wasm tools;
 * VaultProvider gives every output card IndexedDB persistence.
 */

import { AppShell } from "@/components/shell/app-shell";
import { FFmpegEngineProvider } from "@/lib/ffmpeg/ffmpeg-context";
import { VaultProvider } from "@/lib/vault/vault-context";

export default function Home() {
  return (
    <FFmpegEngineProvider>
      <VaultProvider>
        <AppShell />
      </VaultProvider>
    </FFmpegEngineProvider>
  );
}
