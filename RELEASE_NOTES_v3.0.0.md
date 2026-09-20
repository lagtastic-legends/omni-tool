# ZenoDeck v3.0.0 — Official Milestone Release

> **Release Date:** September 20, 2026  
> **Tag:** `v3.0.0`  
> **Repository:** [lagtastic-legends/ZenoDeck](https://github.com/lagtastic-legends/ZenoDeck)  
> **Live Web Application:** [zenodeck.vercel.app](https://zenodeck.vercel.app)

---

## 🚀 Welcome to ZenoDeck

**ZenoDeck v3.0.0** marks a landmark transformation: Omni Tool has evolved into **ZenoDeck**, a unified, heavy-duty on-device media suite and document workstation powered by **Zeno AI**.

Every single tool in ZenoDeck operates under our **Zero-Upload Guarantee**: whether compressing multi-gigabyte 4K videos, tuning audio frequencies with 13 DSP engines, or forging encrypted PDF packages, all processing runs **100% locally on your device** via WebAssembly, WebCodecs, and the Web Audio API.

---

## ✨ What's New in v3.0.0

### 1. 🤖 Zeno AI Assistant
- Re-architected intelligent on-device copilot built right into the floating navigation toolbar.
- Provides real-time guidance on FFmpeg filter parameters, audio equalization presets, compression rate factors (CRF), and PDF operations.
- Zero data transmission: your media never touches AI endpoints.

### 2. ⚡ Instant CDN WebAssembly Boot Engine
- Completely re-engineered the FFmpeg WASM loading architecture:
  - Switched from heavy, blocking local multi-worker configurations to an instant-boot, single-threaded CDN engine.
  - Eliminated infinite worker startup stalls, cold-start timeouts, and cross-origin isolation deadlock on mobile WebViews.
  - Added visual boot state indicators with live progress meters and self-healing initialization fallbacks.

### 3. 🎥 Hardware-Accelerated Video Engineering
- **Offline Hardware Video Pipeline**: Integrated WebCodecs (`VideoDecoder`/`VideoEncoder`) paired with an `OffscreenCanvas` WebGL 2.0 shader engine.
- **Fast-Start ISO-BMFF MP4 Muxer**: Muxes `moov` header atoms before `mdat` media payloads for immediate playback without streaming buffer delay.
- **20 GB Zero-Copy WORKERFS Streaming Engine**: Direct kernel-level chunked streaming into WebAssembly with 0 MB input RAM overhead, backed by `android:largeHeap="true"` in the native Android APK.
- **Silent Video Guard**: Pre-flight audio atom inspection prevents FFmpeg exit code 1 failures when extracting audio from silent videos.
- **Lossless Stream Copy**: Added ultra-fast lossless audio track extraction (`-c:a copy`).

### 4. 🎛️ Unified 13-Engine Audio DSP Suite
- Real-time zero-latency auditioning via Web Audio API nodes, paired with studio-grade WASM rendering:
  - Bass Booster (5 progressive tiers with 8kHz clarity compensation)
  - Reverb Studio (8 modeled acoustic spaces)
  - Vocal Remover & Karaoke Maker (OOPS cancellation + 120Hz crossover filter)
  - Spatial 8D Circular Panner & Auto-Panner LFO
  - Studio 6-Band Precision Equalizer
  - Adaptive Spectral FFT Denoising
  - Pitch Shifter & Pitch-Preserving Tempo Changer

### 5. 🎧 Tactile UI Audio & 0ms Sound Feedback
- Built-in mathematical PCM audio synthesis engine executing entirely in-memory:
  - Mechanical Click (55ms snappy switch)
  - Hover Tick (35ms crisp air tick)
  - Harmonic Chime (380ms uplifting C-Major shimmer)
  - Alert Tone (260ms low-mid warning)
- Synchronous touchdown actuation on `pointerdown` aligned with native Capacitor haptic vibrations.
- Global mute toggle with persistent storage across sessions.

### 6. 📱 Android APK Native Enhancements
- Bumped build code to `versionCode 300`, `versionName "3.0.0"`.
- Android 14 Scoped Storage compliance (`READ_MEDIA_VIDEO`, `READ_MEDIA_AUDIO`, `READ_MEDIA_IMAGES`).
- Native Android MediaStore resolver replaces arbitrary photo-picker IDs with real device filenames and camera timestamps.
- Edge-to-edge layout adaptation and full hardware back-button navigation guard.

---

## 📦 Downloads & Verification

| Asset | Platform | File Size | Description |
| :--- | :--- | :--- | :--- |
| **ZenoDeck-v3.0.0-release.apk** | Android 8.0+ (ARM64/x86_64) | ~36 MB | Signed release build, ready to install on Android phones, tablets, foldables, and flips |
| **Source Code (zip / tar.gz)** | Cross-platform | — | Full source code for web, mobile, and custom builds |

---

## 🛠️ Verification & Building from Source

```bash
# Clone the repository
git clone https://github.com/lagtastic-legends/ZenoDeck.git
cd ZenoDeck

# Install dependencies
npm install

# Build static web app
npm run build

# Build Android release APK
$env:MOBILE_EXPORT = "1"; npm run build
npx cap sync android
cd android
.\gradlew assembleRelease
```

---

## 🔒 The Zero-Upload Privacy Guarantee

ZenoDeck operates **no file ingestion or cloud conversion servers**. Your media, private documents, and cryptographic tokens remain strictly on your physical device at all times.
