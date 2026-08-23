"use client";

/**
 * OMNI TOOL — Phase 2: The Video & Visual Engine
 * ---------------------------------------------------
 * Single-canvas SPA ("/"). The FFmpeg engine provider mounts once here;
 * the AppShell switches between the Dashboard hub and tool modules.
 */

import { AppShell } from "@/components/shell/app-shell";
import { FFmpegEngineProvider } from "@/lib/ffmpeg/ffmpeg-context";

export default function Home() {
  return (
    <FFmpegEngineProvider>
      <AppShell />
    </FFmpegEngineProvider>
  );
}
