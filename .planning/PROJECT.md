# Omni Tool — Project Specification

## Core Architecture
- **Framework:** Next.js 16 (Turbopack, Standalone/Static Export) + React 19 + Tailwind CSS 4.
- **Client Processing:** Single-canvas SPA with Zustand client routing (`useNavStore`) designed for hybrid Web + Capacitor Android APK deployment.
- **Engine Layer:** 
  - 100% on-device WebAssembly FFmpeg (`@ffmpeg/ffmpeg` with local WASM assets in `public/ffmpeg/`).
  - Web Audio API DSP pipeline (`src/lib/audio-dsp.ts`).
  - Canvas 2D Generative Inpainting (`src/lib/imaging/ai-watermark.ts`).
  - Local IndexedDB persistence (`src/lib/vault/vault-db.ts` under `omni-vault`).
- **Security Posture:**
  - Strict COOP (`same-origin`) & COEP (`require-corp`) headers for Cross-Origin Isolation on Web.
  - Zero server uploads for media files.
  - Rate-limited and validated AI assistant route (`/api/ai`).

## Active Operating Protocols
1. **Ponytail:** Minimal code, YAGNI, standard library first, zero dependency bloat.
2. **CodeRabbit:** Automated pre-commit audit, zero secret leakage, null safety, memory leak protection.
3. **GSD:** Spec-driven milestones, atomic commits, durable state in `.planning/`.
4. **Ralph Loop:** Fast feedback verification loops (`npm test`, `npx eslint . --quiet`, `npx tsc --noEmit`).
