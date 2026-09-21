"use client";

/**
 * ZENODECK — Screen & CPU Wake Lock Controller
 *
 * Prevents OS sleep, display dimming, and CPU throttling while long
 * WebAssembly media operations (video exports, conversions, audio jobs)
 * are in progress.
 *
 * Automatically re-acquires the lock if the device visibility changes
 * while an active job is still running.
 */

let activeSentinel: any | null = null;
let lockRequestCount = 0;
let isListeningToVisibility = false;

async function requestLock(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
    return false;
  }
  try {
    activeSentinel = await (navigator as any).wakeLock.request("screen");
    activeSentinel.addEventListener?.("release", () => {
      activeSentinel = null;
    });
    return true;
  } catch {
    // Silently degrade on devices/browsers that deny lock (e.g. low battery)
    return false;
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === "visible" && lockRequestCount > 0 && !activeSentinel) {
    void requestLock();
  }
}

/**
 * Acquires a Screen Wake Lock. Safe to call multiple times (ref-counted).
 */
export async function acquireWakeLock(): Promise<boolean> {
  lockRequestCount++;

  if (typeof document !== "undefined" && !isListeningToVisibility) {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    isListeningToVisibility = true;
  }

  if (!activeSentinel) {
    return await requestLock();
  }
  return true;
}

/**
 * Releases a Screen Wake Lock when all tasks conclude.
 */
export async function releaseWakeLock(): Promise<void> {
  lockRequestCount = Math.max(0, lockRequestCount - 1);

  if (lockRequestCount === 0 && activeSentinel) {
    try {
      await activeSentinel.release();
    } catch {}
    activeSentinel = null;
  }

  if (lockRequestCount === 0 && isListeningToVisibility && typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    isListeningToVisibility = false;
  }
}
