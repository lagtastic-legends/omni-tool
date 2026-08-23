/**
 * OMNI TOOL — audio filter-graph builders.
 *
 * Pure functions that emit FFmpeg `-af` chains for the Audio Engineering
 * Suite. Every builder returns an array of filter segments which the tools
 * join with "," and pass to ffmpeg as a single -af argument.
 *
 * All builders validated against the shipped wasm core (libavfilter).
 */

export type AudioFormat = "mp3" | "wav" | "flac" | "ogg" | "m4a";

/* ------------------------------------------------------------------ */
/* Output encoders                                                     */
/* ------------------------------------------------------------------ */

export function audioOutputArgs(format: AudioFormat, kbps: number): string[] {
  switch (format) {
    case "mp3":
      return ["-c:a", "libmp3lame", "-b:a", `${kbps}k`];
    case "wav":
      return ["-c:a", "pcm_s16le"];
    case "flac":
      return ["-c:a", "flac", "-compression_level", "5"];
    case "ogg":
      return ["-c:a", "libvorbis", "-q:a", "6"];
    case "m4a":
      return ["-c:a", "aac", "-b:a", `${Math.min(kbps, 256)}k`];
  }
}

/* ------------------------------------------------------------------ */
/* Slowed + Reverb                                                     */
/* ------------------------------------------------------------------ */

export interface SlowedParams {
  /** 0.5 – 0.95 playback speed factor. */
  factor: number;
  /** 0 – 1 reverb intensity. */
  reverb: number;
  /** Input sample rate (detected via ffprobe at run time). */
  sampleRate: number;
}

export function slowedFilters({ factor, reverb, sampleRate }: SlowedParams): string[] {
  const chain: string[] = [
    // Classic vinyl-style slow: drop the interpreted rate, then resample —
    // lowers BOTH tempo and pitch, exactly like the 33rpm aesthetic.
    `asetrate=${Math.round(sampleRate * factor)}`,
    `aresample=${sampleRate}`,
  ];
  if (reverb >= 0.05) {
    chain.push(echoForIntensity(reverb));
  }
  return chain;
}

function echoForIntensity(reverb: number): string {
  if (reverb < 0.4) {
    return "aecho=0.8:0.85:80|120:0.25|0.2";
  }
  if (reverb < 0.75) {
    return "aecho=0.8:0.9:120|180|60:0.32|0.28|0.22";
  }
  return "aecho=0.8:0.95:180|280|90|40:0.38|0.34|0.28|0.22";
}

/* ------------------------------------------------------------------ */
/* Bass Booster                                                        */
/* ------------------------------------------------------------------ */

export interface BassParams {
  /** 1 – 10 intensity. */
  intensity: number;
  /** Cutoff in Hz. */
  cutoff: number;
  /** +3 dB treble shelf to keep top-end clarity. */
  clarity: boolean;
}

export function bassFilters({ intensity, cutoff, clarity }: BassParams): string[] {
  const gain = (intensity * 1.8).toFixed(1); // up to +18 dB
  const chain = [`bass=g=${gain}:f=${cutoff}:t=q:w=0.8`];
  if (clarity) chain.push("treble=g=3:f=8000:t=q:w=1");
  return chain;
}

/* ------------------------------------------------------------------ */
/* 3D / 8D Audio                                                       */
/* ------------------------------------------------------------------ */

export interface SpatialParams {
  /** Full rotation cycle length in seconds (4 – 16). */
  cycleSec: number;
  /** 0.3 – 1 swing intensity. */
  intensity: number;
}

export function spatialFilters({ cycleSec, intensity }: SpatialParams): string[] {
  const hz = (1 / cycleSec).toFixed(4);
  return [
    "aformat=channel_layouts=stereo",
    "extrastereo=m=1.2",
    `apulsator=hz=${hz}:amount=${intensity.toFixed(2)}:mode=sine:width=0.8`,
  ];
}

/* ------------------------------------------------------------------ */
/* Equalizer                                                           */
/* ------------------------------------------------------------------ */

export const EQ_BANDS = [60, 150, 400, 1000, 2400, 15000] as const;
export type EqGains = number[]; // one per band, -12..+12 dB

export const EQ_PRESETS: { name: string; gains: EqGains }[] = [
  { name: "Flat", gains: [0, 0, 0, 0, 0, 0] },
  { name: "Bass Boost", gains: [8, 6, 3, 0, 0, 0] },
  { name: "Treble Boost", gains: [0, 0, 0, 2, 5, 7] },
  { name: "Vocal", gains: [-2, 0, 4, 4, 3, 0] },
  { name: "Rock", gains: [5, 3, -1, -2, 3, 6] },
  { name: "Electronic", gains: [6, 4, 0, -2, 2, 5] },
];

export function eqFilters(gains: EqGains): string[] {
  return EQ_BANDS.map((f, i) =>
    gains[i] === 0
      ? null
      : `equalizer=f=${f}:t=q:w=1:g=${gains[i]?.toFixed(1)}`,
  ).filter((s): s is string => s !== null);
}

/* ------------------------------------------------------------------ */
/* Reverse                                                             */
/* ------------------------------------------------------------------ */

export function reverseFilters(): string[] {
  return ["areverse"];
}

/* ------------------------------------------------------------------ */
/* Stereo Panner                                                       */
/* ------------------------------------------------------------------ */

export interface PanParams {
  /** -1 full left … +1 full right. */
  balance: number;
}

export function panFilters({ balance }: PanParams): string[] {
  return [
    "aformat=channel_layouts=stereo",
    `stereotools=balance_out=${balance.toFixed(2)}`,
  ];
}

/* ------------------------------------------------------------------ */
/* Volume                                                              */
/* ------------------------------------------------------------------ */

export interface VolumeParams {
  /** Gain in dB (-30 … +20). Ignored when normalize is on. */
  db: number;
  /** Loudness normalization (dynaudnorm single-pass). */
  normalize: boolean;
}

export function volumeFilters({ db, normalize }: VolumeParams): string[] {
  return normalize ? ["dynaudnorm=f=250:g=15:p=0.9"] : [`volume=${db}dB`];
}

/* ------------------------------------------------------------------ */
/* Ringtone / trim + fades                                             */
/* ------------------------------------------------------------------ */

export interface TrimFadeParams {
  startSec: number;
  endSec: number;
  fadeInSec: number;
  fadeOutSec: number;
  /** Optional gain in dB applied after fades. 0 = skip. */
  boostDb?: number;
}

export function trimFadeFilters({
  startSec,
  endSec,
  fadeInSec,
  fadeOutSec,
  boostDb = 0,
}: TrimFadeParams): string[] {
  const length = Math.max(endSec - startSec, 0.1);
  const chain = [
    `atrim=start=${startSec.toFixed(2)}:end=${endSec.toFixed(2)}`,
    "asetpts=PTS-STARTPTS",
  ];
  if (fadeInSec > 0.01) {
    chain.push(`afade=t=in:st=0:d=${fadeInSec.toFixed(2)}`);
  }
  if (fadeOutSec > 0.01) {
    const st = Math.max(length - fadeOutSec, 0).toFixed(2);
    chain.push(`afade=t=out:st=${st}:d=${fadeOutSec.toFixed(2)}`);
  }
  if (boostDb !== 0) {
    chain.push(`volume=${boostDb}dB`);
  }
  return chain;
}

/* ------------------------------------------------------------------ */
/* MP3 Audio Editor — combined deck                                    */
/* ------------------------------------------------------------------ */

export interface EditorParams {
  startSec: number;
  endSec: number;
  /** Source duration in seconds (probed). */
  durationSec: number;
  trimEnabled: boolean;
  /** 0.5 – 2.0 (atempo, pitch-preserving). */
  speed: number;
  reverse: boolean;
  volumeDb: number;
  normalize: boolean;
  fadeInSec: number;
  fadeOutSec: number;
}

export function editorFilters(p: EditorParams): { filters: string[]; finalLengthSec: number } {
  const trimStart = p.trimEnabled ? p.startSec : 0;
  const trimEnd = p.trimEnabled ? p.endSec : p.durationSec;
  const trimLength = Math.max(trimEnd - trimStart, 0.1);

  const filters: string[] = [];
  if (p.trimEnabled) {
    filters.push(
      `atrim=start=${trimStart.toFixed(2)}:end=${trimEnd.toFixed(2)}`,
      "asetpts=PTS-STARTPTS",
    );
  }
  if (p.reverse) filters.push("areverse");
  if (p.speed !== 1) filters.push(`atempo=${p.speed.toFixed(3)}`);
  if (p.normalize) filters.push("dynaudnorm=f=250:g=15:p=0.9");
  else if (p.volumeDb !== 0) filters.push(`volume=${p.volumeDb}dB`);

  const finalLength = trimLength / (p.speed !== 1 ? p.speed : 1);
  if (p.fadeInSec > 0.01) {
    filters.push(`afade=t=in:st=0:d=${Math.min(p.fadeInSec, finalLength).toFixed(2)}`);
  }
  if (p.fadeOutSec > 0.01) {
    const st = Math.max(finalLength - p.fadeOutSec, 0).toFixed(2);
    filters.push(`afade=t=out:st=${st}:d=${p.fadeOutSec.toFixed(2)}`);
  }

  return { filters, finalLengthSec: finalLength };
}
