"use client";

import { useCallback, useEffect, useRef } from "react";
import useSound from "use-sound";
import { Capacitor } from "@capacitor/core";
import { useNavStore } from "@/lib/navigation/nav-store";

const DEFAULT_VOLUME = 0.25;

/**
 * Unlock the Web Audio API AudioContext on Android WebView.
 *
 * Android's WebView blocks AudioContext playback until a user gesture
 * (touchstart / click / keydown) triggers `.resume()`. Howler.js (used by
 * use-sound) creates a global AudioContext under `Howler.ctx` — if it's
 * suspended we force-resume it on the first interaction.
 *
 * This also creates + immediately closes a silent oscillator to satisfy
 * the browser's "user activation" requirement for audio playback.
 */
let _audioUnlocked = false;

function unlockAudioContext(): void {
  if (_audioUnlocked) return;

  const unlock = () => {
    if (_audioUnlocked) return;
    _audioUnlocked = true;

    try {
      // 1. Resume Howler's global AudioContext if suspended
      const Howler = (globalThis as any).Howler;
      if (Howler?.ctx && Howler.ctx.state === "suspended") {
        Howler.ctx.resume().catch(() => {});
      }

      // 2. Play a silent buffer to fully unlock audio on WebView
      const ctx: AudioContext | undefined =
        Howler?.ctx ?? (typeof AudioContext !== "undefined" ? new AudioContext() : undefined);
      if (ctx) {
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        src.stop(0.001);
      }
    } catch {
      // Graceful — audio will attempt again on next interaction
    }

    // Remove listeners once unlocked
    document.removeEventListener("touchstart", unlock, true);
    document.removeEventListener("touchend", unlock, true);
    document.removeEventListener("click", unlock, true);
    document.removeEventListener("keydown", unlock, true);
  };

  document.addEventListener("touchstart", unlock, true);
  document.addEventListener("touchend", unlock, true);
  document.addEventListener("click", unlock, true);
  document.addEventListener("keydown", unlock, true);
}

export interface UIAudioControls {
  playHover: () => void;
  playClick: () => void;
  playSuccess: () => void;
  playError: () => void;
  isAudioMuted: boolean;
  toggleAudioMuted: () => void;
  setAudioMuted: (muted: boolean) => void;
}

/**
 * useUIAudio — Lightweight, non-blocking UI audio feedback system.
 *
 * Automatically guards against muted audio state, provides subtle default volume (0.25),
 * and handles browser audio autoplay policies gracefully.
 *
 * On Android native (Capacitor WebView), registers a one-time AudioContext
 * unlock listener on mount so Howler.js sounds play correctly after the
 * first user gesture.
 */
export function useUIAudio(options?: { volume?: number }): UIAudioControls {
  const isAudioMuted = useNavStore((s) => s.isAudioMuted);
  const toggleAudioMuted = useNavStore((s) => s.toggleAudioMuted);
  const setAudioMuted = useNavStore((s) => s.setAudioMuted);
  const unlockRegistered = useRef(false);

  const vol = options?.volume ?? DEFAULT_VOLUME;

  // Register AudioContext unlock on first mount (critical for Android APK)
  useEffect(() => {
    if (!unlockRegistered.current) {
      unlockRegistered.current = true;
      unlockAudioContext();
    }
  }, []);

  const [rawPlayHover] = useSound("/sounds/hover.mp3", {
    volume: vol * 0.75, // Hover is kept slightly softer
    soundEnabled: !isAudioMuted,
    interrupt: true,
  });

  const [rawPlayClick] = useSound("/sounds/click.mp3", {
    volume: vol,
    soundEnabled: !isAudioMuted,
    interrupt: true,
  });

  const [rawPlaySuccess] = useSound("/sounds/success.mp3", {
    volume: vol * 1.1,
    soundEnabled: !isAudioMuted,
    interrupt: false,
  });

  const [rawPlayError] = useSound("/sounds/error.mp3", {
    volume: vol * 1.1,
    soundEnabled: !isAudioMuted,
    interrupt: false,
  });

  /** Attempt Howler, fall back to raw Audio() on Android if Howler fails. */
  const safePlay = useCallback(
    (rawPlay: () => void, soundPath: string) => {
      if (useNavStore.getState().isAudioMuted) return;
      try {
        // Ensure Howler ctx is resumed before every play on native
        if (Capacitor.isNativePlatform()) {
          const Howler = (globalThis as any).Howler;
          if (Howler?.ctx?.state === "suspended") {
            Howler.ctx.resume().catch(() => {});
          }
        }
        rawPlay();
      } catch {
        // Fallback: native Audio API (works in most WebViews)
        try {
          const audio = new Audio(soundPath);
          audio.volume = vol;
          audio.play().catch(() => {});
        } catch {
          // Completely silent fallback — no sound is not fatal
        }
      }
    },
    [vol],
  );

  const playHover = useCallback(() => safePlay(rawPlayHover, "/sounds/hover.mp3"), [safePlay, rawPlayHover]);
  const playClick = useCallback(() => safePlay(rawPlayClick, "/sounds/click.mp3"), [safePlay, rawPlayClick]);
  const playSuccess = useCallback(() => safePlay(rawPlaySuccess, "/sounds/success.mp3"), [safePlay, rawPlaySuccess]);
  const playError = useCallback(() => safePlay(rawPlayError, "/sounds/error.mp3"), [safePlay, rawPlayError]);

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
