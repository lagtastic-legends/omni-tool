"use client";

/**
 * Engine-side audio probing. The classic "slowed" effect (asetrate) needs
 * the input sample rate, which browsers won't expose for a File — so we
 * ask the resident ffprobe inside the wasm engine.
 *
 * Writes nothing to disk except a scratch text file that is deleted in a
 * finally block. Falls back to 44100 when probing fails.
 */

import type { FFmpeg } from "@ffmpeg/ffmpeg";

const SCRATCH = "__sr_probe.txt";

export async function detectSampleRate(
  engine: FFmpeg,
  inputPath: string,
): Promise<number> {
  try {
    await engine.ffprobe([
      "-show_entries",
      "stream=sample_rate",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      inputPath,
      "-o",
      SCRATCH,
    ]);
    const txt = await engine.readFile(SCRATCH, "utf8");
    const match = String(txt).match(/(\d{3,6})/);
    if (match) {
      const sr = Number(match[1]);
      if (sr >= 8000 && sr <= 192000) return sr;
    }
    return 44100;
  } catch {
    return 44100;
  } finally {
    try {
      await engine.deleteFile(SCRATCH);
    } catch {
      /* scratch file never landed — nothing to clean */
    }
  }
}
