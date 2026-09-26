# ZenoDeck v3.4.6 — Python 4K 60FPS Engine, Android Native Network & Clipboard, and Release Renaming

> **Release Date:** September 26, 2026  
> **Tag:** `v3.4.6`  
> **Repository:** [lagtastic-legends/zenodeck](https://github.com/lagtastic-legends/zenodeck)  
> **Direct APK Downloads:**  
> - **`zenodeck.apk`** (Universal Latest Release)  
> - **`zenodeck-v3.4.6.apk`** (Versioned Release)  

---

## 🚀 Overview

**ZenoDeck v3.4.6** introduces the Python 4K 60FPS YouTube engine powered by `yt-dlp`, resolves the Android APK "Failed to fetch" resolution error using native `CapacitorHttp` bypassing browser CORS, fixes the clipboard Paste button on Android via native `ClipboardManager`, adds an inline URL Clear (`X`) button, and renames GitHub release assets to **`zenodeck.apk`** and **`zenodeck-v3.4.6.apk`**.

---

## 📦 What's New in v3.4.6

### 🐍 1. Python 4K 60FPS YouTube Engine
- **Dedicated Python Engine (`scripts/youtube_downloader.py`)**: High-performance metadata extraction and stream downloading using `yt-dlp`.
- **Ultra HD & 60FPS Support**: Automatically discovers and formats streams up to 4K (2160p60), 2K (1440p60), 1080p60, and studio audio tiers (320 kbps MP3, 256 kbps AAC, WAV PCM).
- **Backend API Integration**: `/api/youtube/info` automatically invokes the Python engine when available, ensuring zero cloud bot restrictions.

### ⚡ 2. Android APK Resolution Fix (`CapacitorHttp`)
- **Root Cause Eradicated**: Chrome WebView inside Android APK enforced cross-origin restrictions when querying YouTube InnerTube player endpoints, resulting in `TypeError: Failed to fetch`.
- **Native Network Routing**: Integrated `universalFetch` backed by `CapacitorHttp`. Requests are routed through Android's native `HttpURLConnection`, completely bypassing browser CORS and utilizing the device's real mobile carrier or Wi-Fi residential IP.
- **Robust URL Sanitation**: Strips accidental trailing punctuation (e.g. colons, trailing query artifacts) before resolution.

### 📋 3. Native Android Clipboard Paste
- **Native `ClipboardManager` Plugin**: Added `@PluginMethod public void readClipboard` to `OmniRecorderPlugin.java`.
- **Instant Pasting**: Fixes Android WebView clipboard permission denials (`NotAllowedError`). Tapping "Paste" in the APK now immediately retrieves clipboard content.

### ❌ 4. Inline Clear / Remove Link Button
- Added an intuitive Clear (`X`) button inside the URL input that appears whenever text is present, allowing one-tap removal and state reset.

### 📱 5. Renamed Release Assets
- Release assets are now cleanly published as:
  - **`zenodeck.apk`**
  - **`zenodeck-v3.4.6.apk`**

---

## 🧪 Verification & Automated Checks

- **Python 4K Downloader**: Verified extraction on YouTube video `2uuPU2K_w9c` with full stream manifests.
- **TypeScript Typecheck**: Passing with 0 errors (`npx tsc --noEmit`).
- **YouTube Test Suite**: 65 / 65 automated tests passing cleanly.
- **Android Release Packaging**: Signed production APK compiled with target SDK 36 and Android version code 346 (`3.4.6`).
