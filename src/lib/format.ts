/**
 * Shared formatting helpers used across the Omni Tool UI.
 */

export function formatBytes(bytes: number, fractionDigits = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(exponent >= 2 ? fractionDigits : 0)} ${units[exponent]}`;
}

export function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(2)} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}m ${rest}s`;
}

export function formatClock(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

export function formatMediaTime(microseconds: number): string {
  const totalSeconds = Math.floor(microseconds / 1_000_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
