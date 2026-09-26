import { Capacitor } from "@capacitor/core";
import { OmniRecorder } from "./native-recorder";

/**
 * Universal clipboard reader that works natively on Android APK (via ClipboardManager)
 * and falls back to standard Web navigator.clipboard on desktop/mobile browsers.
 */
export async function getClipboardText(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await OmniRecorder.readClipboard();
      if (res && typeof res.value === "string") {
        return res.value;
      }
    } catch (err) {
      console.warn("Native clipboard read failed, falling back to navigator:", err);
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.readText) {
    try {
      return await navigator.clipboard.readText();
    } catch (err) {
      console.warn("Navigator clipboard read failed:", err);
    }
  }

  return "";
}

/**
 * Universal clipboard writer supporting native Android and Web Clipboard API.
 */
export async function setClipboardText(text: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      await OmniRecorder.writeClipboard({ value: text });
      return true;
    } catch {}
  }

  if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }

  return false;
}
