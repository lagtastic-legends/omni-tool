"use client";

import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";

export type DeviceFormFactor =
  | "slab-portrait"
  | "slab-landscape"
  | "flip-flex"
  | "fold-dual"
  | "tablet"
  | "desktop";

export interface DevicePostureState {
  formFactor: DeviceFormFactor;
  orientation: "portrait" | "landscape";
  isMobile: boolean;
  isFoldable: boolean;
  isFlexMode: boolean;
  isTouch: boolean;
  isNative: boolean;
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * useDevicePosture — Hardware-aware device posture & screen geometry engine.
 *
 * Detects:
 * - Slab phones (portrait <640px, landscape <900px with small height)
 * - Flip phones in Flex Mode (90° folded posture or ~1:1 top/bottom split)
 * - Foldables in Dual-Pane Book Mode (unfolded wide aspect ratio ~4:3 or ~1:1 with width >=600px)
 * - Tablets (>=768px touch devices)
 * - Desktops (large viewport, mouse primary)
 */
export function useDevicePosture(): DevicePostureState {
  const [state, setState] = useState<DevicePostureState>(() => {
    // Default SSR safe fallback
    return {
      formFactor: "desktop",
      orientation: "landscape",
      isMobile: false,
      isFoldable: false,
      isFlexMode: false,
      isTouch: false,
      isNative: false,
      width: 1280,
      height: 720,
      aspectRatio: 16 / 9,
    };
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isNative = Capacitor.isNativePlatform?.() === true;
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    const computePosture = (): DevicePostureState => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const orientation = width >= height ? "landscape" : "portrait";
      const ar = width / Math.max(1, height);

      // Check for CSS Device Posture API / Foldable media queries if available
      const flexModeQuery = window.matchMedia?.(
        "(device-posture: folded), (spanning: single-fold-horizontal)"
      );
      const isFoldedCss = flexModeQuery?.matches ?? false;

      // Unfolded dual-pane foldables typically have an inner screen aspect ratio between 0.85 and 1.25,
      // with both width and height exceeding 580px
      const isDualPaneFoldable =
        isTouch &&
        width >= 580 &&
        height >= 580 &&
        ar >= 0.82 &&
        ar <= 1.28;

      // Flip phones in Flex Mode: propped up at 90° angle
      // Often results in folded CSS posture, or extreme vertical split when folded
      const isFlexMode = isFoldedCss;

      let formFactor: DeviceFormFactor = "desktop";

      if (isFlexMode) {
        formFactor = "flip-flex";
      } else if (isDualPaneFoldable) {
        formFactor = "fold-dual";
      } else if (isTouch && width >= 768 && height >= 768) {
        formFactor = "tablet";
      } else if (width < 640 && orientation === "portrait") {
        formFactor = "slab-portrait";
      } else if (height < 520 && orientation === "landscape") {
        formFactor = "slab-landscape";
      } else if (width < 1024 && isTouch) {
        formFactor = orientation === "portrait" ? "slab-portrait" : "tablet";
      } else {
        formFactor = "desktop";
      }

      const isMobile =
        formFactor === "slab-portrait" ||
        formFactor === "slab-landscape" ||
        formFactor === "flip-flex";

      return {
        formFactor,
        orientation,
        isMobile,
        isFoldable: isDualPaneFoldable || isFlexMode,
        isFlexMode,
        isTouch,
        isNative,
        width,
        height,
        aspectRatio: ar,
      };
    };

    const handleUpdate = () => {
      setState(computePosture());
    };

    handleUpdate();

    window.addEventListener("resize", handleUpdate, { passive: true });
    window.addEventListener("orientationchange", handleUpdate, { passive: true });

    // Listen for device posture changes if browser supports them
    let mql: MediaQueryList | null = null;
    try {
      mql = window.matchMedia?.("(device-posture: folded)");
      mql?.addEventListener?.("change", handleUpdate);
    } catch {}

    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("orientationchange", handleUpdate);
      try {
        mql?.removeEventListener?.("change", handleUpdate);
      } catch {}
    };
  }, []);

  return state;
}
