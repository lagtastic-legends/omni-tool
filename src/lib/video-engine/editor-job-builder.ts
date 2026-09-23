/**
 * OMNI TOOL — Real Video Editor Job Builder
 *
 * Compiles timeline clips, color grading, aspect ratio framing, text overlays,
 * speed adjustments, and audio staging into an executable FFmpeg WASM JobSpec.
 */

import { baseName, extOf, mimeFor } from "@/lib/media/ffmpeg-jobs";
import type { JobSpec } from "@/hooks/use-media-job";
import {
  type EditorTransition,
  type VideoTransitionType,
  buildXFadeFiltergraph,
} from "./transitions";

export type { EditorTransition, VideoTransitionType };

export interface EditorClip {
  id: string;
  name: string;
  startSec: number;
  endSec: number;
  duration: number;
}

export interface EditorColorFilter {
  preset: "none" | "vibrant" | "cinematic" | "cyberpunk" | "noir" | "vintage" | "highcontrast";
  brightness: number; // -0.5 to 0.5 (default 0)
  contrast: number;   // 0.5 to 2.0 (default 1)
  saturation: number; // 0 to 2.5 (default 1)
}

export interface EditorTextOverlay {
  enabled: boolean;
  text: string;
  position: "top" | "center" | "bottom" | "bottom-left" | "top-right";
  size: "sm" | "md" | "lg" | "xl";
  theme: "box" | "clean" | "gold" | "neon";
}

export interface EditorJobOptions {
  file: File;
  sourceWidth: number;
  sourceHeight: number;
  hasAudio: boolean;
  clips: EditorClip[];
  colorFilter: EditorColorFilter;
  aspectRatio: "original" | "16:9" | "9:16" | "1:1" | "4:3";
  resolution: "source" | "1080p" | "720p" | "480p";
  speed: number;
  volume: number;
  isMuted: boolean;
  textOverlay: EditorTextOverlay;
  transition?: EditorTransition;
}

/**
 * Generate a transparent PNG containing the rendered text overlay
 * sized to match the target video dimensions.
 */
export async function renderTextOverlayPng(
  overlay: EditorTextOverlay,
  width: number,
  height: number
): Promise<Uint8Array | null> {
  if (!overlay.enabled || !overlay.text.trim() || typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(320, width);
  canvas.height = Math.max(240, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Determine font size relative to canvas width
  const baseFontSize =
    overlay.size === "sm" ? 24 : overlay.size === "md" ? 36 : overlay.size === "lg" ? 52 : 68;
  const scaleFactor = Math.min(canvas.width / 1280, canvas.height / 720);
  const fontSize = Math.max(16, Math.round(baseFontSize * Math.max(0.6, scaleFactor)));

  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textBaseline = "middle";

  const lines = overlay.text.split("\n");
  const maxLineWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const lineHeight = fontSize * 1.35;
  const blockHeight = lines.length * lineHeight;
  const paddingX = fontSize * 0.8;
  const paddingY = fontSize * 0.5;
  const boxWidth = maxLineWidth + paddingX * 2;
  const boxHeight = blockHeight + paddingY * 2;

  // Determine Position Coordinates
  let boxX = (canvas.width - boxWidth) / 2;
  let boxY = (canvas.height - boxHeight) / 2;

  const margin = Math.round(40 * scaleFactor);

  switch (overlay.position) {
    case "top":
      boxX = (canvas.width - boxWidth) / 2;
      boxY = margin;
      break;
    case "center":
      boxX = (canvas.width - boxWidth) / 2;
      boxY = (canvas.height - boxHeight) / 2;
      break;
    case "bottom":
      boxX = (canvas.width - boxWidth) / 2;
      boxY = canvas.height - boxHeight - margin;
      break;
    case "bottom-left":
      boxX = margin;
      boxY = canvas.height - boxHeight - margin;
      break;
    case "top-right":
      boxX = canvas.width - boxWidth - margin;
      boxY = margin;
      break;
  }

  // Draw styled background box if theme specifies
  if (overlay.theme === "box") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.beginPath();
    const r = Math.min(12, fontSize * 0.3);
    if (typeof (ctx as any).roundRect === "function") {
      (ctx as any).roundRect(boxX, boxY, boxWidth, boxHeight, r);
    } else {
      ctx.rect(boxX, boxY, boxWidth, boxHeight);
    }
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Text Styling
  lines.forEach((line, idx) => {
    const textY = boxY + paddingY + (idx + 0.5) * lineHeight;
    const textX = boxX + paddingX + (maxLineWidth - ctx.measureText(line).width) / 2;

    switch (overlay.theme) {
      case "gold":
        ctx.shadowColor = "rgba(245, 158, 11, 0.8)";
        ctx.shadowBlur = 12;
        ctx.fillStyle = "#FBBF24";
        break;
      case "neon":
        ctx.shadowColor = "rgba(6, 182, 212, 0.9)";
        ctx.shadowBlur = 16;
        ctx.fillStyle = "#22D3EE";
        break;
      case "clean":
        ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
        ctx.shadowBlur = 8;
        ctx.fillStyle = "#FFFFFF";
        break;
      case "box":
      default:
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 4;
        ctx.fillStyle = "#FFFFFF";
        break;
    }

    ctx.fillText(line, textX, textY);
  });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return null;
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Resolve target output dimensions based on user resolution and aspect ratio choices.
 */
export function resolveTargetDimensions(
  sourceW: number,
  sourceH: number,
  aspectRatio: "original" | "16:9" | "9:16" | "1:1" | "4:3",
  res: "source" | "1080p" | "720p" | "480p"
): { width: number; height: number } {
  let w = sourceW || 1920;
  let h = sourceH || 1080;

  // Base resolution target
  const maxDim = res === "1080p" ? 1080 : res === "720p" ? 720 : res === "480p" ? 480 : Math.max(w, h);

  switch (aspectRatio) {
    case "16:9":
      return {
        width: Math.round(maxDim * (16 / 9)),
        height: maxDim,
      };
    case "9:16": // Vertical Shorts / Reels / TikTok
      return {
        width: maxDim,
        height: Math.round(maxDim * (16 / 9)),
      };
    case "1:1": // Square
      return {
        width: maxDim,
        height: maxDim,
      };
    case "4:3":
      return {
        width: Math.round(maxDim * (4 / 3)),
        height: maxDim,
      };
    case "original":
    default:
      if (res === "source") return { width: w, height: h };
      const scale = maxDim / Math.max(w, h);
      return {
        width: Math.round((w * scale) / 2) * 2,
        height: Math.round((h * scale) / 2) * 2,
      };
  }
}

/**
 * Compile user video edits into an executable FFmpeg WASM JobSpec.
 */
export async function buildEditorJobSpec(options: EditorJobOptions): Promise<JobSpec> {
  const {
    file,
    sourceWidth,
    sourceHeight,
    hasAudio,
    clips,
    colorFilter,
    aspectRatio,
    resolution,
    speed,
    volume,
    isMuted,
    textOverlay,
    transition,
  } = options;

  const srcExt = extOf(file.name) || "mp4";
  const virtualInputPath = `/mnt_0/input.${srcExt}`;
  const outName = `${baseName(file.name)}-edit.mp4`;

  const dims = resolveTargetDimensions(sourceWidth, sourceHeight, aspectRatio, resolution);
  // Ensure even dimensions for H.264
  const targetW = Math.round(dims.width / 2) * 2;
  const targetH = Math.round(dims.height / 2) * 2;

  // 1. Check if text overlay is used and generate transparent PNG
  const overlayBytes = await renderTextOverlayPng(textOverlay, targetW, targetH);
  const hasOverlay = overlayBytes !== null;

  const writes: { path: string; data: Uint8Array }[] = [];
  const cleanups: string[] = ["output.mp4"];

  if (hasOverlay && overlayBytes) {
    writes.push({ path: "overlay.png", data: overlayBytes });
    cleanups.push("overlay.png");
  }

  // 2. Build Video Filtergraph Chain
  const vFilters: string[] = [];

  // Color Grading
  if (colorFilter.preset !== "none") {
    switch (colorFilter.preset) {
      case "vibrant":
        vFilters.push("eq=contrast=1.12:saturation=1.35");
        break;
      case "cinematic":
        vFilters.push(
          "eq=contrast=1.18:saturation=0.92,colorchannelmixer=1.06:0:0:0:0:1.0:0:0:0:0:0.92"
        );
        break;
      case "cyberpunk":
        vFilters.push(
          "eq=contrast=1.22:saturation=1.4,colorchannelmixer=0.88:0:0:0:0:1.08:0:0:0:0:1.28"
        );
        break;
      case "noir":
        vFilters.push("hue=s=0,eq=contrast=1.28:brightness=-0.03");
        break;
      case "vintage":
        vFilters.push(
          "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,eq=contrast=1.1"
        );
        break;
      case "highcontrast":
        vFilters.push("eq=contrast=1.35:saturation=1.15:brightness=-0.02");
        break;
    }
  }

  // Manual Color Grading Sliders
  if (
    colorFilter.brightness !== 0 ||
    colorFilter.contrast !== 1 ||
    colorFilter.saturation !== 1
  ) {
    vFilters.push(
      `eq=brightness=${colorFilter.brightness.toFixed(2)}:contrast=${colorFilter.contrast.toFixed(2)}:saturation=${colorFilter.saturation.toFixed(2)}`
    );
  }

  // Scaling and Framing (Aspect ratio adaptation with black padding)
  vFilters.push(
    `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease`,
    `pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:black`
  );

  // Speed Adjustment (Video PTS)
  if (speed !== 1) {
    const ptsMultiplier = (1 / speed).toFixed(4);
    vFilters.push(`setpts=${ptsMultiplier}*PTS`);
  }

  // 3. Audio Filtergraph Chain
  const aFilters: string[] = [];
  if (speed !== 1) {
    if (speed >= 0.5 && speed <= 2.0) {
      aFilters.push(`atempo=${speed.toFixed(3)}`);
    } else if (speed > 2.0) {
      aFilters.push("atempo=2.0", `atempo=${(speed / 2).toFixed(3)}`);
    } else {
      aFilters.push("atempo=0.5", `atempo=${(speed / 0.5).toFixed(3)}`);
    }
  }

  if (volume !== 1) {
    aFilters.push(`volume=${volume.toFixed(2)}`);
    if (volume > 1) {
      aFilters.push("alimiter=limit=0.98");
    }
  }

  // 4. Construct FFmpeg Command Arguments
  // Multi-clip vs Single-trim mode
  const validClips = clips.filter((c) => c.endSec > c.startSec);
  const isMultiClip = validClips.length > 1;
  const isSingleTrim = validClips.length === 1;

  let execArgs: string[] = [];

  if (isMultiClip) {
    // Multi-clip trimming and concatenation pipeline (with optional xfade transitions)
    const hasAudioStreams = hasAudio && !isMuted;
    let filterComplex = "";
    let finalVOut = "[vconcat]";
    let finalAOut: string | null = hasAudioStreams ? "[aconcat]" : null;

    if (transition && transition.type !== "none") {
      const xfadeRes = buildXFadeFiltergraph(validClips, transition, hasAudio, isMuted);
      filterComplex = xfadeRes.filterComplex;
      finalVOut = xfadeRes.finalVLabel;
      finalAOut = xfadeRes.finalALabel;
    } else {
      const inLabels: string[] = [];
      validClips.forEach((clip, idx) => {
        filterComplex += `[0:v]trim=start=${clip.startSec.toFixed(3)}:end=${clip.endSec.toFixed(3)},setpts=PTS-STARTPTS[v${idx}];`;
        if (hasAudioStreams) {
          filterComplex += `[0:a]atrim=start=${clip.startSec.toFixed(3)}:end=${clip.endSec.toFixed(3)},asetpts=PTS-STARTPTS[a${idx}];`;
          inLabels.push(`[v${idx}][a${idx}]`);
        } else {
          inLabels.push(`[v${idx}]`);
        }
      });
      filterComplex += `${inLabels.join("")}concat=n=${validClips.length}:v=1:a=${hasAudioStreams ? 1 : 0}[vconcat]${hasAudioStreams ? "[aconcat]" : ""};`;
      finalVOut = "[vconcat]";
      finalAOut = hasAudioStreams ? "[aconcat]" : null;
    }

    if (vFilters.length > 0) {
      filterComplex += `${finalVOut}${vFilters.join(",")}[vfiltered];`;
      finalVOut = "[vfiltered]";
    }

    if (hasOverlay) {
      filterComplex += `${finalVOut}[1:v]overlay=0:0[vfinal];`;
      finalVOut = "[vfinal]";
    }

    if (hasAudioStreams && aFilters.length > 0 && finalAOut) {
      filterComplex += `${finalAOut}${aFilters.join(",")}[afinal];`;
      finalAOut = "[afinal]";
    }

    const cleanFilterComplex = filterComplex.replace(/;+$/, "");

    execArgs = [
      "-i", virtualInputPath,
      ...(hasOverlay ? ["-i", "overlay.png"] : []),
      "-filter_complex", cleanFilterComplex,
      "-map", finalVOut,
      ...(finalAOut ? ["-map", finalAOut] : ["-an"]),
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "22",
      "-pix_fmt", "yuv420p",
      ...(finalAOut ? ["-c:a", "aac", "-b:a", "192k"] : []),
      "-movflags", "+faststart",
      "output.mp4",
    ];
  } else {
    // Single trimmed segment or full duration
    const trim = isSingleTrim ? validClips[0] : null;
    const startSec = trim ? trim.startSec : 0;
    const durationSec = trim ? trim.duration : 0;

    let filterComplex = "";
    let finalVLabel = "[v_out]";
    let finalALabel = "[a_out]";

    if (hasOverlay) {
      const vChain = vFilters.length > 0 ? vFilters.join(",") : "null";
      filterComplex = `[0:v]${vChain}[v_base];[v_base][1:v]overlay=0:0[v_out]`;
      if (hasAudio && !isMuted && aFilters.length > 0) {
        filterComplex += `;[0:a]${aFilters.join(",")}[a_out]`;
      }
    } else if (vFilters.length > 0 || (hasAudio && !isMuted && aFilters.length > 0)) {
      if (vFilters.length > 0) {
        filterComplex = `[0:v]${vFilters.join(",")}[v_out]`;
      }
      if (hasAudio && !isMuted && aFilters.length > 0) {
        filterComplex += (filterComplex ? ";" : "") + `[0:a]${aFilters.join(",")}[a_out]`;
      }
    }

    execArgs = [
      ...(startSec > 0 ? ["-ss", startSec.toFixed(3)] : []),
      "-i", virtualInputPath,
      ...(hasOverlay ? ["-i", "overlay.png"] : []),
      ...(durationSec > 0 ? ["-t", durationSec.toFixed(3)] : []),
    ];

    if (filterComplex) {
      execArgs.push(
        "-filter_complex", filterComplex,
        "-map", vFilters.length > 0 || hasOverlay ? finalVLabel : "0:v",
        ...(hasAudio && !isMuted
          ? aFilters.length > 0
            ? ["-map", finalALabel]
            : ["-map", "0:a?"]
          : ["-an"])
      );
    } else {
      if (isMuted || !hasAudio) {
        execArgs.push("-an");
      }
    }

    execArgs.push(
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "22",
      "-pix_fmt", "yuv420p",
      ...(hasAudio && !isMuted ? ["-c:a", "aac", "-b:a", "192k"] : []),
      "-movflags", "+faststart",
      "output.mp4"
    );
  }

  return {
    write: writes.length > 0 ? writes : undefined,
    inputFiles: [{ file, name: `input.${srcExt}`, mountPoint: "/mnt_0" }],
    passes: [
      {
        exec: execArgs,
        label: "Baking Video Master (Trim, Shaders, Typography & Codec)",
      },
    ],
    read: [
      {
        path: "output.mp4",
        mime: mimeFor("mp4"),
        name: outName,
      },
    ],
    cleanup: cleanups,
  };
}
