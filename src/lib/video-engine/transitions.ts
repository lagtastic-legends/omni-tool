/**
 * ZENODECK — Video Transitions Engine
 *
 * Provides real-time preview configurations and frame-accurate FFmpeg WASM
 * filtergraph compilers (xfade + acrossfade) for seamless clip-to-clip transitions.
 */

import type { EditorClip } from "./editor-job-builder";

export type VideoTransitionType =
  | "none"
  | "fade"
  | "wipeleft"
  | "wiperight"
  | "slideleft"
  | "slideright"
  | "fadeblack"
  | "fadewhite"
  | "zoomin";

export interface EditorTransition {
  type: VideoTransitionType;
  duration: number; // Duration in seconds (e.g., 0.5)
}

export interface TransitionPresetMeta {
  type: VideoTransitionType;
  label: string;
  category: "classic" | "motion" | "lighting" | "stylized";
  description: string;
  iconName: string;
}

export const TRANSITION_PRESETS: TransitionPresetMeta[] = [
  {
    type: "none",
    label: "Hard Cut",
    category: "classic",
    description: "Instant cut with zero frame blending",
    iconName: "Scissors",
  },
  {
    type: "fade",
    label: "Cross Dissolve",
    category: "classic",
    description: "Smooth linear alpha blend between clips",
    iconName: "Layers",
  },
  {
    type: "wipeleft",
    label: "Wipe Left",
    category: "motion",
    description: "Horizontal linear wipe revealing next clip from the right",
    iconName: "ChevronsLeft",
  },
  {
    type: "wiperight",
    label: "Wipe Right",
    category: "motion",
    description: "Horizontal linear wipe revealing next clip from the left",
    iconName: "ChevronsRight",
  },
  {
    type: "slideleft",
    label: "Slide Left (Whip)",
    category: "motion",
    description: "Fast directional motion slide into the next clip",
    iconName: "ArrowLeft",
  },
  {
    type: "slideright",
    label: "Slide Right",
    category: "motion",
    description: "Fast directional motion slide revealing from left",
    iconName: "ArrowRight",
  },
  {
    type: "fadeblack",
    label: "Dip to Black",
    category: "lighting",
    description: "Dramatic cinematic fade through pure black",
    iconName: "Moon",
  },
  {
    type: "fadewhite",
    label: "Dip to White",
    category: "lighting",
    description: "High-exposure flash transition into the next scene",
    iconName: "Sun",
  },
  {
    type: "zoomin",
    label: "Zoom In",
    category: "stylized",
    description: "Dynamic scale-up push into the next clip",
    iconName: "ZoomIn",
  },
];

export interface XFadeGraphResult {
  filterComplex: string;
  finalVLabel: string;
  finalALabel: string | null;
}

/**
 * Compiles a sequence of clips and transition settings into an FFmpeg filter_complex chain.
 *
 * For N clips:
 * 1. Each clip is trimmed:
 *    [0:v]trim=start=S:end=E,setpts=PTS-STARTPTS[v0];
 * 2. Consecutive clips are blended via xfade:
 *    [v0][v1]xfade=transition=fade:duration=D:offset=T1[vt1];
 *    [vt1][v2]xfade=transition=fade:duration=D:offset=T2[vt2];
 * 3. Audio streams are blended via acrossfade:
 *    [a0][a1]acrossfade=d=D[at1];
 *    [at1][a2]acrossfade=d=D[at2];
 */
export function buildXFadeFiltergraph(
  clips: EditorClip[],
  transition: EditorTransition,
  hasAudio: boolean,
  isMuted: boolean
): XFadeGraphResult {
  const validClips = clips.filter((c) => c.endSec > c.startSec);
  const hasAudioStreams = hasAudio && !isMuted;

  if (validClips.length < 2 || transition.type === "none") {
    // Return standard concat chain fallback
    let filterComplex = "";
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

    return {
      filterComplex,
      finalVLabel: "[vconcat]",
      finalALabel: hasAudioStreams ? "[aconcat]" : null,
    };
  }

  // Ensure transition duration does not exceed half the shortest clip duration
  const minClipDuration = Math.min(...validClips.map((c) => c.duration));
  const safeDuration = Math.max(0.1, Math.min(transition.duration, minClipDuration * 0.45));

  let filterComplex = "";

  // 1. Trimming each clip independently
  validClips.forEach((clip, idx) => {
    filterComplex += `[0:v]trim=start=${clip.startSec.toFixed(3)}:end=${clip.endSec.toFixed(3)},setpts=PTS-STARTPTS[v${idx}];`;
    if (hasAudioStreams) {
      filterComplex += `[0:a]atrim=start=${clip.startSec.toFixed(3)}:end=${clip.endSec.toFixed(3)},asetpts=PTS-STARTPTS[a${idx}];`;
    }
  });

  // 2. Build Video xfade chain
  let lastVLabel = "[v0]";
  let accumulatedTime = validClips[0].duration;

  for (let i = 1; i < validClips.length; i++) {
    const nextVLabel = `[v${i}]`;
    const isLast = i === validClips.length - 1;
    const outVLabel = isLast ? "[v_xfaded]" : `[v_xfade_${i}]`;
    const offset = Math.max(0, accumulatedTime - safeDuration);

    filterComplex += `${lastVLabel}${nextVLabel}xfade=transition=${transition.type}:duration=${safeDuration.toFixed(3)}:offset=${offset.toFixed(3)}${outVLabel};`;

    lastVLabel = outVLabel;
    accumulatedTime = offset + validClips[i].duration;
  }

  // 3. Build Audio acrossfade chain (if audio is present)
  let lastALabel: string | null = null;

  if (hasAudioStreams) {
    lastALabel = "[a0]";
    for (let i = 1; i < validClips.length; i++) {
      const nextALabel = `[a${i}]`;
      const isLast = i === validClips.length - 1;
      const outALabel = isLast ? "[a_xfaded]" : `[a_xfade_${i}]`;

      filterComplex += `${lastALabel}${nextALabel}acrossfade=d=${safeDuration.toFixed(3)}:c1=tri:c2=tri${outALabel};`;
      lastALabel = outALabel;
    }
  }

  return {
    filterComplex,
    finalVLabel: lastVLabel,
    finalALabel: lastALabel,
  };
}
