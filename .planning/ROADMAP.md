# Omni Tool — Project Roadmap & Milestone Verification

## Milestones

### Phase 1: Core Scaffolding & WASM Setup
- [x] Next.js 16 + React 19 + Tailwind CSS 4 scaffolding.
- [x] FFmpeg.wasm client-side boot machine (`ffmpeg-context.tsx`).
- [x] Self-hosted offline assets (`public/ffmpeg/ffmpeg-core.{js,wasm}`).
- [x] Verification: Cross-origin isolation headers enabled.

### Phase 2: Video & Visual Engine
- [x] Media Converter (x264/AAC, WebM/Vorbis, audio extraction).
- [x] Video Compressor (CRF 18-38, scale caps, savings stats).
- [x] Video Mute (instant stream-copy with x264 fallback).
- [x] GIF Maker (2-pass palettegen + paletteuse dither).
- [x] Verification: Tested end-to-end with fixture runs.

### Phase 3: Advanced Audio Engineering Suite
- [x] 13 DSP modules (Spatial 8D, Auto-Panner, Bass Booster, Equalizer, Reverb, Vocal Remover, etc.).
- [x] Real-time Web Audio graph previews + batch FFmpeg exports.
- [x] Verification: Pure argument generation tests passing.

### Phase 4: Document Forge
- [x] Visual PDF Deck, Scan-to-PDF, Text-to-PDF, Lock-PDF.
- [x] Client-side generation via `@cantoo/pdf-lib`.

### Phase 5: Studio Recorder & Omni Vault
- [x] Camera, Microphone, and Screen recording with audio level visualization.
- [x] IndexedDB vault storage (`omni-vault`) with quota metrics and sample synthesis.

### Phase 6: QR Studio & Telemetry
- [x] Client-side QR generator and camera scanner.
- [x] Telemetry stdout console.

### Phase 7: Quality Hardening & Dependency Pruning (Current Milestone)
- [x] Pruned 16 unused dependencies (removed 313 npm packages).
- [x] Fixed broken ESLint flat config and resolved all 9 Rules-of-Hooks / purity errors.
- [x] Hardened `/api/ai` with rate-limiting and payload validation.
- [x] Self-hosted `ffmpeg-core.wasm` locally in `public/ffmpeg/`.
- [x] Native Node test runner integrated (`npm test`).
- [x] v2.9.0 released with automated CI/CD workflows and professional repository templates.
