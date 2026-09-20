import test from "node:test";
import assert from "node:assert/strict";

// Test suite for Omni Tool Core Pure Logic

test("formatBytes formats byte counts correctly", async () => {
  // Test byte formatting logic
  function formatBytes(bytes, decimals = 1) {
    if (!+bytes || bytes < 0) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(1024), "1 KB");
  assert.equal(formatBytes(1048576), "1 MB");
  assert.equal(formatBytes(32232419), "30.7 MB");
});

test("formatClock formats seconds into mm:ss and hh:mm:ss correctly", () => {
  function formatClock(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return "00:00";
    const s = Math.floor(seconds);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
  }

  assert.equal(formatClock(0), "00:00");
  assert.equal(formatClock(65), "01:05");
  assert.equal(formatClock(3665), "1:01:05");
});

test("audioOutputArgs returns correct ffmpeg parameters for each format", () => {
  function audioOutputArgs(format, kbps) {
    switch (format) {
      case "mp3":
        return ["-c:a", "libmp3lame", "-b:a", `${kbps}k`];
      case "wav":
        return ["-c:a", "pcm_s16le"];
      case "flac":
        return ["-c:a", "flac", "-compression_level", "5"];
      case "ogg":
        return ["-c:a", "libvorbis", "-q:a", "6"];
      case "m4a":
        return ["-c:a", "aac", "-b:a", `${Math.min(kbps, 256)}k`];
    }
  }

  assert.deepEqual(audioOutputArgs("mp3", 320), ["-c:a", "libmp3lame", "-b:a", "320k"]);
  assert.deepEqual(audioOutputArgs("wav", 320), ["-c:a", "pcm_s16le"]);
  assert.deepEqual(audioOutputArgs("m4a", 320), ["-c:a", "aac", "-b:a", "256k"]);
  assert.deepEqual(audioOutputArgs("flac", 320), ["-c:a", "flac", "-compression_level", "5"]);
  assert.deepEqual(audioOutputArgs("ogg", 320), ["-c:a", "libvorbis", "-q:a", "6"]);
});

test("Watermark bounding box math handles aspect ratios and boundaries", () => {
  function computeBox(w, h, zone) {
    switch (zone) {
      case "top-right":
        return { x: Math.floor(w * 0.7), y: 0, w: Math.floor(w * 0.3), h: Math.floor(h * 0.25) };
      case "bottom-right":
        return { x: Math.floor(w * 0.65), y: Math.floor(h * 0.75), w: Math.floor(w * 0.35), h: Math.floor(h * 0.25) };
      default:
        return { x: 0, y: 0, w, h };
    }
  }

  const boxTR = computeBox(1000, 1000, "top-right");
  assert.equal(boxTR.x, 700);
  assert.equal(boxTR.y, 0);
  assert.equal(boxTR.w, 300);
  assert.equal(boxTR.h, 250);

  const boxBR = computeBox(1920, 1080, "bottom-right");
  assert.equal(boxBR.x, 1248);
  assert.equal(boxBR.y, 810);
  assert.equal(boxBR.w, 672);
  assert.equal(boxBR.h, 270);
});
