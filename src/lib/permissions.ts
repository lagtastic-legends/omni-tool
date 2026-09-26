import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Filesystem } from "@capacitor/filesystem";
import { OmniRecorder } from "@/lib/native-recorder";

export type PermissionStatusState = "granted" | "denied" | "prompt";

export interface SystemPermissionStatus {
  camera: PermissionStatusState;
  microphone: PermissionStatusState;
  notifications: PermissionStatusState;
  storage: PermissionStatusState;
}

/**
 * Normalizes string permission states from various Capacitor plugins
 */
function normalizeState(val?: string): PermissionStatusState {
  if (!val) return "prompt";
  const lower = val.toLowerCase();
  if (lower === "granted") return "granted";
  if (lower === "denied") return "denied";
  return "prompt";
}

/**
 * Checks live runtime permission states from the native OS.
 */
export async function checkAppPermissions(): Promise<SystemPermissionStatus> {
  if (!Capacitor.isNativePlatform()) {
    let notifState: PermissionStatusState = "prompt";
    if (typeof window !== "undefined" && "Notification" in window) {
      notifState =
        Notification.permission === "granted"
          ? "granted"
          : Notification.permission === "denied"
            ? "denied"
            : "prompt";
    }
    return {
      camera: "granted",
      microphone: "granted",
      notifications: notifState,
      storage: "granted",
    };
  }

  // 1. Primary: Query through OmniRecorder native version-aware dispatcher
  try {
    const all = await OmniRecorder.checkAllPermissions();
    if (all) {
      return {
        camera: normalizeState(all.camera),
        microphone: normalizeState(all.microphone),
        notifications: normalizeState(all.notifications),
        storage: normalizeState(all.storage),
      };
    }
  } catch {
    // Fall back to individual checks
  }

  let camera: PermissionStatusState = "prompt";
  let microphone: PermissionStatusState = "prompt";
  let notifications: PermissionStatusState = "prompt";
  let storage: PermissionStatusState = "prompt";

  try {
    const omniPerms = await OmniRecorder.checkPermissions();
    camera = normalizeState(omniPerms.camera);
    microphone = normalizeState(omniPerms.microphone);
  } catch {}

  try {
    const notifPerm = await LocalNotifications.checkPermissions();
    notifications = normalizeState(notifPerm.display);
  } catch {}

  try {
    const fsPerm = await Filesystem.checkPermissions();
    storage = normalizeState((fsPerm as any).publicStorage || (fsPerm as any).publicStorageAboveAPI29);
  } catch {
    storage = "granted";
  }

  return {
    camera,
    microphone,
    notifications,
    storage,
  };
}

/**
 * Requests all required app permissions in one unified batch
 */
export async function requestAllAppPermissions(): Promise<SystemPermissionStatus> {
  if (!Capacitor.isNativePlatform()) {
    await ensureNotificationPermission();
    return checkAppPermissions();
  }

  try {
    await OmniRecorder.requestAllPermissions();
  } catch {
    try {
      await OmniRecorder.requestPermissions({ permissions: ["camera", "microphone", "storage"] });
    } catch {}
    try {
      await ensureNotificationPermission();
    } catch {}
  }

  return checkAppPermissions();
}

/**
 * Ensures camera permission is granted in-context before activating camera hardware.
 */
export async function ensureCameraPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;

  try {
    const current = await OmniRecorder.checkPermissions();
    if (current.camera === "granted") return true;

    const requested = await OmniRecorder.requestPermissions({ permissions: ["camera"] });
    return requested.camera === "granted";
  } catch (err) {
    console.warn("Failed to request native camera permission:", err);
    return false;
  }
}

/**
 * Ensures microphone permission is granted in-context before starting recording.
 */
export async function ensureMicrophonePermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;

  try {
    const current = await OmniRecorder.checkPermissions();
    if (current.microphone === "granted") return true;

    const requested = await OmniRecorder.requestPermissions({ permissions: ["microphone"] });
    return requested.microphone === "granted";
  } catch (err) {
    console.warn("Failed to request native microphone permission:", err);
    return false;
  }
}

/**
 * Ensures notification permission is granted for background task alerts.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const current = await LocalNotifications.checkPermissions();
      if (current.display === "granted") return true;

      const requested = await LocalNotifications.requestPermissions();
      return requested.display === "granted";
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") return true;
      if (Notification.permission !== "denied") {
        const res = await Notification.requestPermission();
        return res === "granted";
      }
    }
  } catch (err) {
    console.warn("Failed to request notification permission:", err);
  }
  return false;
}

/**
 * Ensures storage permission is granted for file operations on older Android versions.
 */
export async function ensureStoragePermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;

  try {
    const current = await Filesystem.checkPermissions();
    const st = (current as any).publicStorage || (current as any).publicStorageAboveAPI29;
    if (st === "granted") return true;

    const requested = await Filesystem.requestPermissions();
    const reqSt = (requested as any).publicStorage || (requested as any).publicStorageAboveAPI29;
    return reqSt === "granted";
  } catch {
    // On Android 13+, scoped storage allows writing without legacy permission
    return true;
  }
}

/**
 * Opens system app settings screen on Android so the user can easily toggle blocked permissions.
 */
export async function openAppSettings(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await OmniRecorder.openAppSettings();
    } catch (err) {
      console.warn("Could not open system settings:", err);
    }
  }
}
