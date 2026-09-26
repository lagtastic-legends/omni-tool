# ZenoDeck v3.4.0 — Direct Audio Studio & Studio-Grade Performance

> **Release Date:** September 26, 2026  
> **Tag:** `v3.4.0`  
> **Repository:** [lagtastic-legends/zenodeck](https://github.com/lagtastic-legends/zenodeck)  
> **Live Web Application:** [https://omni-tool-two.vercel.app](https://omni-tool-two.vercel.app)  
> **Direct APK Download:** [https://omni-tool-two.vercel.app/zenodeck.apk](https://omni-tool-two.vercel.app/zenodeck.apk)

---

## 🚀 Overview

**ZenoDeck v3.4.0** delivers a major upgrade to audio processing and systems reliability across the entire workstation. Building on the ultra-fast 4K 60fps YouTube engine, v3.4.0 introduces **Direct Audio Conversion** with multi-tier quality mastering, **complete memory leak elimination** across all processing tools, **sub-second responsive QR generation**, and **zero-error strict type safety**.

---

## 📦 What's New in v3.4.0

### 🎵 1. Direct YouTube Audio Studio & Multi-Tier Mastering
- **Direct Multi-Bitrate MP3 Extraction:**
  - **Studio Master (320 kbps):** Ultra-high fidelity audio encoding for audiophile listening.
  - **High Fidelity (256 kbps):** Crisp, detailed audio for everyday music enjoyment.
  - **Standard Crisp (192 kbps):** Balanced profile optimized for bandwidth and fidelity.
  - **Voice & Podcast (128 kbps):** Lightweight, speech-optimized encoding for podcasts and lectures.
- **Lossless Native Audio Stream Extraction:**
  - **Native AAC (M4A):** Zero re-encoding extraction of YouTube's native 128–160 kbps AAC stream with zero generational quality loss.
  - **Studio Master PCM (WAV):** Uncompressed 16-bit 44.1 kHz WAV container for immediate DAW editing in FL Studio, Ableton, or Pro Tools.
- **Embedded Audio Deck:** Integrated audio preview player with live waveform styling, time counter, and instant "Save Audio to Device" action.

### 🛡️ 2. Total Memory Leak Elimination (High-Scale Multi-Job Sessions)
- **YouTube Downloader:** Tracks all generated video and audio blob URLs in reactive refs (`currentResultUrlRef`) and guarantees clean revocation on resets, subsequent downloads, and component unmounts.
- **Generative Watermark Remover:** Prevents multi-hundred-megabyte uncompressed image buffers from lingering in heap by tracking `originalSrc` and `cleanedSrc` lifecycles.
- **PDF Engines (Image-to-PDF & Scan-to-PDF):** Fixed React stale closures in unmount cleanup by moving preview URL tracking into reactive refs (`imagesRef`, `pagesRef`), ensuring 100% of temporary preview URLs are revoked when leaving the screen.
- **ASCII Art Generator:** Terminated in-flight Web Worker threads before launching new render passes during slider scrubbing, and immediately revoked inline worker script URLs.

### ⚡ 3. FFmpeg Precision & Routing Fixes
- **GIF Maker Frame-Accuracy:** Fixed parameter scoping bug where `-t clipLen` was misplaced in the second pass; GIFs now strictly respect the user's selected start/duration range.
- **Instant Stream Playback (`-movflags +faststart`):** Configured video mute outputs with faststart flags to place the `moov` atom at the file head for instant progressive streaming without downloading full files.
- **Media Converter Normalization:** Standardized trim arguments to `["-ss", start.toFixed(2), "-t", (end - start).toFixed(2)]`.
- **Hybrid API Architecture:** Configured route handlers to support both dynamic streaming in web production and static bundle export for Android Capacitor.

### 🎨 4. Real-Time QR Studio Polish
- **Live Debounced Generation:** Added an automatic 250ms debounced render loop that updates the QR code canvas in real time as the user types text or tweaks colors/sizes.
- **Output Lifecycle Tracking:** Streamlined QR PNG downloads with automatic blob URL disposal upon clearing.

### 🧹 5. Codebase Cleanliness & Strict Type Safety
- **Purged 1,130 Lines of Dead Code:** Removed 7 orphaned UI stubs that depended on uninstalled packages (`vaul`, `recharts`, `embla-carousel-react`, `@prisma/client`).
- **Strict TypeScript Validation:** Passed `npx tsc --noEmit` with **0 errors across all source files**.

---

## 📱 Release Assets

| Asset Name | Target Platform | Type | Description |
| :--- | :--- | :--- | :--- |
| **`app-release.apk` / `zenodeck.apk`** | Android 7.0+ (Phones & Tablets) | Signed Release APK (v3.4.0) | Production signed APK with v1 + v2 signing schemes, ready for direct install and sideloading. |
| **`app-release.aab`** | Google Play Store | Android App Bundle (v3.4.0) | Release bundle built with Target SDK 36 (Android 15+). |
| **`zenodeck.mobileconfig`** | Apple iOS / iPadOS | Web Clip Profile | Apple Configuration Profile for home-screen standalone web app installation. |
