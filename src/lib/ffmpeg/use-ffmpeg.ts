"use client";

/**
 * Typed accessor for the shared FFmpeg engine.
 *
 * Usage:
 *   const { state, engine, boot } = useFFmpegEngine();
 *   if (state === "ready" && engine) { await engine.exec([...]) }
 */
import { useContext } from "react";
import { FFmpegEngineContext } from "./ffmpeg-context";

export function useFFmpegEngine() {
  const ctx = useContext(FFmpegEngineContext);
  if (!ctx) {
    throw new Error(
      "useFFmpegEngine must be used inside <FFmpegEngineProvider>.",
    );
  }
  return ctx;
}
