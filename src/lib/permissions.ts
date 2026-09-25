import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { OmniRecorder } from "@/lib/native-recorder";

export type PermissionStatusState = "granted" | "denied" | "prompt";

export interface SystemPermissionStatus {
  camera: PermissionStatusState;
  microphone: PermissionStatusState;
  notifications: PermissionStatusState;
  storage: PermissionStatusState;
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

  let camera: PermissionStatusState = "prompt";
  let microphone: PermissionStatusState = "prompt";
  let notifications: PermissionStatusState = "prompt";

  try {
    const omniPerms = await OmniRecorder.checkPermissions();
    if (omniPerms.camera === "granted") camera = "granted";
    else if (omniPerms.camera === "denied") camera = "denied";

    if (omniPerms.microphone === "granted") microphone = "granted";
    else if (omniPerms.microphone === "denied") microphone = "denied";
  } catch {
    // Non-fatal
  }

  try {
    const notifPerm = await LocalNotifications.checkPermissions();
    if (notifPerm.display === "granted") notifications = "granted";
    else if (notifPerm.display === "denied") notifications = "denied";
  } catch {
    // Non-fatal
  }

  return {
    camera,
    microphone,
    notifications,
    storage: "granted", // Android Scoped Storage / Private sandbox is always granted
  };
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
