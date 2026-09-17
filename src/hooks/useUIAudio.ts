"use client";

import { useCallback } from "react";
import { useNavStore } from "@/lib/navigation/nav-store";

/**
 * DEFAULT_VOLUME = 0.65
 * Tuned specifically for phone and tablet speakers so that tactile
 * button clicks and system chimes are crisp, clear, and distinct.
 */
const DEFAULT_VOLUME = 0.65;
const SAMPLE_RATE = 44100;

export type SoundType = "hover" | "click" | "success" | "error";

export interface UIAudioControls {
  playHover: () => void;
  playClick: () => void;
  playSuccess: () => void;
  playError: () => void;
  isAudioMuted: boolean;
  toggleAudioMuted: () => void;
  setAudioMuted: (muted: boolean) => void;
}

// ---------------------------------------------------------------------
// In-Memory PCM Waveform Generators (0ms Latency, Zero Codec Overhead)
// ---------------------------------------------------------------------

/** 1. Hover: 35ms clean high-presence tick */
function generateHoverPCM(): Float32Array {
  const duration = 0.035;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 140);
    const freq = 2400 - t * 12000;
    samples[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.75;
  }
  return samples;
}

/** 2. Click: 55ms punchy tactile snap (Apple / Pixel mechanical switch style) */
function generateClickPCM(): Float32Array {
  const duration = 0.055;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const snapEnv = Math.exp(-t * 120);
    const snap = Math.sin(2 * Math.PI * (1600 - t * 14000) * t);
    const bodyEnv = Math.exp(-t * 70);
    const body = 0.6 * Math.sin(2 * Math.PI * 750 * t) + 0.4 * Math.sin(2 * Math.PI * 380 * t);
    samples[i] = (0.55 * snap * snapEnv + 0.45 * body * bodyEnv) * 0.95;
  }
  return samples;
}

/** 3. Success: 380ms uplifting harmonic chime (C5 -> E5 -> G5 -> C6 shimmer) */
function generateSuccessPCM(): Float32Array {
  const duration = 0.38;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    // C5 (523.25 Hz)
    const env1 = Math.exp(-t * 9);
    const n1 = (Math.sin(2 * Math.PI * 523.25 * t) + 0.25 * Math.sin(2 * Math.PI * 1046.5 * t)) * env1;

    // E5 (659.25 Hz)
    const t2 = t - 0.055;
    const env2 = t2 > 0 ? Math.exp(-t2 * 8) : 0;
    const n2 = t2 > 0 ? (Math.sin(2 * Math.PI * 659.25 * t2) + 0.2 * Math.sin(2 * Math.PI * 1318.5 * t2)) * env2 : 0;

    // G5 (783.99 Hz)
    const t3 = t - 0.11;
    const env3 = t3 > 0 ? Math.exp(-t3 * 7) : 0;
    const n3 = t3 > 0 ? (Math.sin(2 * Math.PI * 783.99 * t3) + 0.2 * Math.sin(2 * Math.PI * 1568.0 * t3)) * env3 : 0;

    // C6 (1046.5 Hz)
    const t4 = t - 0.165;
    const env4 = t4 > 0 ? Math.exp(-t4 * 6) : 0;
    const n4 = t4 > 0 ? Math.sin(2 * Math.PI * 1046.5 * t4) * env4 : 0;

    samples[i] = (n1 * 0.3 + n2 * 0.3 + n3 * 0.35 + n4 * 0.4) * 0.95;
  }
  return samples;
}

/** 4. Error: 260ms subtle dual low-mid alert tone (340Hz -> 240Hz) */
function generateErrorPCM(): Float32Array {
  const duration = 0.26;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    // Pulse 1: 340Hz
    const env1 = t < 0.11 ? Math.sin(Math.PI * (t / 0.11)) : 0;
    const n1 = Math.sin(2 * Math.PI * 340 * t) * env1;

    // Pulse 2: 240Hz
    const t2 = t - 0.12;
    const env2 = t2 > 0 && t2 < 0.13 ? Math.sin(Math.PI * (t2 / 0.13)) : 0;
    const n2 = t2 > 0 ? Math.sin(2 * Math.PI * 240 * t2) * env2 : 0;

    samples[i] = (n1 * 0.55 + n2 * 0.65) * 0.9;
  }
  return samples;
}

// ---------------------------------------------------------------------
// Singleton AudioContext & Buffer Pool
// ---------------------------------------------------------------------

let sharedAudioCtx: AudioContext | null = null;
const soundBuffers = new Map<SoundType, AudioBuffer>();

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioCtx = new AudioContextClass();
    }
  }
  return sharedAudioCtx;
}

function getSoundBuffer(ctx: AudioContext, type: SoundType): AudioBuffer {
  let buf = soundBuffers.get(type);
  if (!buf) {
    let pcm: Float32Array;
    switch (type) {
      case "hover":
        pcm = generateHoverPCM();
        break;
      case "click":
        pcm = generateClickPCM();
        break;
      case "success":
        pcm = generateSuccessPCM();
        break;
      case "error":
        pcm = generateErrorPCM();
        break;
    }
    buf = ctx.createBuffer(1, pcm.length, SAMPLE_RATE);
    buf.copyToChannel(pcm, 0);
    soundBuffers.set(type, buf);
  }
  return buf;
}

/** Global gesture listener — immediately unlocks audio context on first screen tap */
if (typeof window !== "undefined") {
  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  };
  window.addEventListener("pointerdown", unlock, { capture: true, passive: true });
  window.addEventListener("touchstart", unlock, { capture: true, passive: true });
  window.addEventListener("click", unlock, { capture: true, passive: true });
  window.addEventListener("keydown", unlock, { capture: true, passive: true });
}

/**
 * Universal sound player:
 * 1. Checks if audio is muted in Zustand store
 * 2. Attempts in-memory Web Audio AudioBuffer playback (0ms latency)
 * 3. Falls back to HTML5 Audio element (.wav / .mp3) if needed
 */
export function playSound(type: SoundType, volumeScale: number = 1.0) {
  if (typeof window === "undefined") return;
  if (useNavStore.getState().isAudioMuted) return;

  try {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      const buffer = getSoundBuffer(ctx, type);
      if (buffer) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.value = Math.max(0, Math.min(1, DEFAULT_VOLUME * volumeScale));
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start(0);
        return;
      }
    }
  } catch {
    // Fall through to HTML5 audio element
  }

  // Graceful fallback for non-WebAudio environments
  try {
    const audio = new Audio(`/sounds/${type}.wav`);
    audio.volume = Math.max(0, Math.min(1, DEFAULT_VOLUME * volumeScale));
    audio.play().catch(() => {});
  } catch {
    // Completely non-blocking
  }
}

/**
 * useUIAudio — Lightweight, non-blocking UI audio feedback system.
 *
 * Provides instant tactile micro-feedback (hover, click, success, error) with:
 * - 0ms latency in-memory Web Audio synthesis
 * - AudioContext auto-unlock for Android WebView APK
 * - Fallback to HTML5 audio files
 * - Synchronized with Zustand navigation store mute state
 */
export function useUIAudio(options?: { volume?: number }): UIAudioControls {
  const isAudioMuted = useNavStore((s) => s.isAudioMuted);
  const toggleAudioMuted = useNavStore((s) => s.toggleAudioMuted);
  const setAudioMuted = useNavStore((s) => s.setAudioMuted);

  const vol = options?.volume ?? 1.0;

  const playHover = useCallback(() => {
    playSound("hover", vol * 0.7);
  }, [vol]);

  const playClick = useCallback(() => {
    playSound("click", vol * 1.0);
  }, [vol]);

  const playSuccess = useCallback(() => {
    playSound("success", vol * 0.95);
  }, [vol]);

  const playError = useCallback(() => {
    playSound("error", vol * 0.95);
  }, [vol]);

  return {
    playHover,
    playClick,
    playSuccess,
    playError,
    isAudioMuted,
    toggleAudioMuted,
    setAudioMuted,
  };
}
