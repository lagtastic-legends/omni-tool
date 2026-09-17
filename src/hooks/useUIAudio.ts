"use client";

import { useCallback } from "react";
import useSound from "use-sound";
import { useNavStore } from "@/lib/navigation/nav-store";

const DEFAULT_VOLUME = 0.25;

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
 */
export function useUIAudio(options?: { volume?: number }): UIAudioControls {
  const isAudioMuted = useNavStore((s) => s.isAudioMuted);
  const toggleAudioMuted = useNavStore((s) => s.toggleAudioMuted);
  const setAudioMuted = useNavStore((s) => s.setAudioMuted);

  const vol = options?.volume ?? DEFAULT_VOLUME;

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

  const playHover = useCallback(() => {
    if (useNavStore.getState().isAudioMuted) return;
    try {
      rawPlayHover();
    } catch {
      // Audio autoplay policy or device fallback
    }
  }, [rawPlayHover]);

  const playClick = useCallback(() => {
    if (useNavStore.getState().isAudioMuted) return;
    try {
      rawPlayClick();
    } catch {
      // Audio autoplay policy or device fallback
    }
  }, [rawPlayClick]);

  const playSuccess = useCallback(() => {
    if (useNavStore.getState().isAudioMuted) return;
    try {
      rawPlaySuccess();
    } catch {
      // Audio autoplay policy or device fallback
    }
  }, [rawPlaySuccess]);

  const playError = useCallback(() => {
    if (useNavStore.getState().isAudioMuted) return;
    try {
      rawPlayError();
    } catch {
      // Audio autoplay policy or device fallback
    }
  }, [rawPlayError]);

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
