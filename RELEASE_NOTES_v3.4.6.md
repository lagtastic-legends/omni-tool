# ZenoDeck v3.4.6 — Python 4K 60FPS Engine, Granular Media Permissions, & Universal Release APKs

> **Release Date:** September 26, 2026  
> **Tag:** `v3.4.6`  
> **Repository:** [lagtastic-legends/zenodeck](https://github.com/lagtastic-legends/zenodeck)  
> **Direct APK Downloads:**  
> - [**`zenodeck.apk`**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.4.6/zenodeck.apk) (Universal Latest Release)  
> - [**`zenodeck-v3.4.6.apk`**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.4.6/zenodeck-v3.4.6.apk) (Versioned Release Archive)  
> - [**Direct Web Mirror**](https://omni-tool-two.vercel.app/zenodeck.apk)  

---

## 🚀 Overview

**ZenoDeck v3.4.6** is a major feature and reliability release that introduces the high-performance Python 4K 60FPS YouTube engine (`yt-dlp`), adds granular media permissions (**Photos & Videos** and **Music & Audios**) across Android 9 through Android 15+, resolves 0% download stalls via CDN candidate promotion and resilient stream fallbacks, fixes native Android clipboard paste via `ClipboardManager`, and standardizes all release assets to **`zenodeck.apk`** and **`zenodeck-v3.4.6.apk`**.

---

## 📦 What's New in v3.4.6

### 🐍 1. Python 4K 60FPS YouTube Engine (`yt-dlp`)
- **Dedicated Python Engine (`scripts/youtube_downloader.py`)**: High-performance metadata extraction and stream resolution powered by `yt-dlp`.
- **Ultra HD & 60FPS Support**: Automatically discovers and formats streams up to 4K (2160p60), 2K (1440p60), 1080p60, and studio audio tiers (320 kbps MP3, 256 kbps AAC, WAV PCM).
- **Backend API Integration**: `/api/youtube/info` automatically invokes the Python engine when available, ensuring zero cloud bot restrictions.

### 📱 2. Granular Android Media Permissions (Android 9 – 15+)
- **Photos & Videos (`READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO`)**: Declared and managed across Android 13+ with partial photo selection (`READ_MEDIA_VISUAL_USER_SELECTED`) on Android 14+ (API 34+), with automated fallback to `READ_EXTERNAL_STORAGE` on Android 12 and below.
- **Music & Audios (`READ_MEDIA_AUDIO`)**: Dedicated audio access on Android 13+ and `READ_EXTERNAL_STORAGE` fallback on legacy Android versions.
- **In-App Device Permissions Dialog**: View real-time OS permission grants and request individual or batch access in one tap.

### ⚡ 3. Zero-Stall Turbo Downloads & Resilient Stream Fallbacks
- **Candidate Node Promotion**: Automatically detects when GoogleVideo CDN edge nodes throttle or time out, testing alternate candidate nodes and promoting responsive nodes to the front. Eliminates the 0% freeze issue on Android APK and Web.
- **Dynamic Worker Switching**: Multi-worker chunk streams automatically adapt to healthy CDN nodes mid-download with zero throughput drops.
- **Resilient Audio & Video Exports**: Both audio extractions (MP3, AAC, WAV) and high-resolution video streams feature defensive fallbacks to native direct containers (`.m4a`, `.webm`, `.mp4`) if FFmpeg WebAssembly is slow or initializing. Downloads never fail or abort.

### 📋 4. Native Android Clipboard Paste & URL Clear Button
- **Native `ClipboardManager` Plugin**: Added `@PluginMethod public void readClipboard` to `OmniRecorderPlugin.java`. Tapping "Paste" in the APK now reliably retrieves clipboard content, overcoming WebView `NotAllowedError` sandbox restrictions.
- **Inline Clear (`X`)**: One-tap URL removal and input reset directly in the input bar.

### 📱 5. Renamed Release Assets
- Release assets are now cleanly published as:
  - **`zenodeck.apk`** (Universal Latest Release)
  - **`zenodeck-v3.4.6.apk`** (Versioned Release)

---

## 🔒 Verification & Package Checksums

| File | Size (Bytes) | SHA-256 Checksum |
| :--- | :--- | :--- |
| **`zenodeck.apk`** | 25,199,129 | `A3EBCD59144E7B9E5029419E173B8DDA1D91D24059EF3AF2C2E6A112B7B6E2FE` |
| **`zenodeck-v3.4.6.apk`** | 25,199,129 | `A3EBCD59144E7B9E5029419E173B8DDA1D91D24059EF3AF2C2E6A112B7B6E2FE` |

- **TypeScript Compilation**: Passed with 0 errors (`npx tsc --noEmit`).
- **YouTube Test Suite**: 65 / 65 automated tests passing cleanly (`scripts/test-youtube-suite.ts`).
- **Android Target**: Compiled with Android SDK 36 (target API 36, min API 28).

