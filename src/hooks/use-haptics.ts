"use client";

import { useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

export type HapticImpact = "light" | "medium" | "heavy";
export type HapticNotification = "success" | "warning" | "error";

/**
 * useHaptics — 120Hz-tuned physical tactile feedback engine.
 *
 * Interfaces natively with @capacitor/haptics on Android/iOS
 * and gracefully falls back to the Web Vibration API on supported mobile browsers,
 * or silent no-op on non-haptic hardware.
 */
export function useHaptics() {
  const isNative = typeof window !== "undefined" && Capacitor.isNativePlatform?.() === true;

  const impact = useCallback(
    async (style: HapticImpact = "light") => {
      try {
        if (isNative) {
          const styleMap = {
            light: ImpactStyle.Light,
            medium: ImpactStyle.Medium,
            heavy: ImpactStyle.Heavy,
          };
          await Haptics.impact({ style: styleMap[style] });
        } else if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          const durations = {
            light: 10,
            medium: 25,
            heavy: 50,
          };
          navigator.vibrate(durations[style]);
        }
      } catch {
        // Silently degrade on unsupported hardware or permission block
      }
    },
    [isNative]
  );

  const notification = useCallback(
    async (type: HapticNotification = "success") => {
      try {
        if (isNative) {
          const typeMap = {
            success: NotificationType.Success,
            warning: NotificationType.Warning,
            error: NotificationType.Error,
          };
          await Haptics.notification({ type: typeMap[type] });
        } else if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          const patterns = {
            success: [15, 50, 20],
            warning: [20, 60, 20],
            error: [40, 60, 40, 60, 40],
          };
          navigator.vibrate(patterns[type]);
        }
      } catch {
        // Silently degrade
      }
    },
    [isNative]
  );

  const selectionStart = useCallback(async () => {
    try {
      if (isNative) {
        await Haptics.selectionStart();
      }
    } catch {}
  }, [isNative]);

  const selectionChanged = useCallback(async () => {
    try {
      if (isNative) {
        await Haptics.selectionChanged();
      } else if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(6);
      }
    } catch {}
  }, [isNative]);

  const selectionEnd = useCallback(async () => {
    try {
      if (isNative) {
        await Haptics.selectionEnd();
      }
    } catch {}
  }, [isNative]);

  return {
    impact,
    notification,
    selectionStart,
    selectionChanged,
    selectionEnd,
    // Semantic aliases
    light: useCallback(() => impact("light"), [impact]),
    medium: useCallback(() => impact("medium"), [impact]),
    heavy: useCallback(() => impact("heavy"), [impact]),
    success: useCallback(() => notification("success"), [notification]),
    error: useCallback(() => notification("error"), [notification]),
    warning: useCallback(() => notification("warning"), [notification]),
  };
}
