# Omni Tool — Multi-Agent Worklog

---
Task ID: 1
Agent: Super Z (principal engineer, main agent)
Task: PHASE 1 — Core Scaffolding & WASM Setup (Next.js 16, Tailwind 4, dark futuristic UI, FFmpeg.wasm client-side init with Cross-Origin Isolation)

Work Log:
- Initialized fullstack environment (Next.js 16.1.3 + Turbopack, Tailwind 4, shadcn/ui, framer-motion 12).
- Installed @ffmpeg/ffmpeg@0.12.15, @ffmpeg/util@0.12.2, @ffmpeg/core@0.12.10 (single-thread core — works with or without SAB).
- Read @ffmpeg dist sources: confirmed module-worker flow (classWorkerURL → type:"module" worker; importScripts fails → dynamic ESM import of core) and toBlobURL(url, mime, progress, cb) signature.
- Self-hosted engine assets in public/ffmpeg/: worker.js + const.js + errors.js (from @ffmpeg/ffmpeg/dist/esm) and ffmpeg-core.js + ffmpeg-core.wasm (32.2 MB, from @ffmpeg/core/dist/esm). Zero runtime CDN dependency.
- next.config.ts: COOP=same-origin + COEP=require-corp headers on all routes (verified live via curl: crossOriginIsolated === true in browser), immutable cache on /ffmpeg/*, allowedDevOrigins for preview.
- eslint.config.mjs: ignore public/** (vendored emscripten output).
- Theme (globals.css): dark-only oklch token set (violet-black bg, electric violet primary), neon palette vars (--neon cyan / --plasma fuchsia / --pulse emerald / --abyss) exposed via @theme inline; utilities: panel-hud, bg-hud-grid, scanlines, glow text/box, scroll-hud scrollbars, shimmer/caret/drift animations, prefers-reduced-motion guards.
- layout.tsx: Orbitron (display) + Space Grotesk (body) + Geist Mono via next/font; dark class; Omni metadata + SVG favicon.
- Engine layer: src/lib/ffmpeg/ffmpeg-context.tsx (FFmpegEngineProvider — state machine idle/loading/ready/error, boot stages worker→fetch→compile→online, REAL byte-level download progress via toBlobURL cb, log ring buffer 400 lines, progress relay, SSR-safe capability probes, shutdown/retry) + use-ffmpeg.ts hook.
- CRITICAL FIX (found via agent-browser E2E): Turbopack rewrites import.meta.url to file:// in dev → worker construction failed. Fix: resolve classWorkerURL to absolute URL via new URL(path, window.location.href).href.
- Shell components: aurora-background.tsx (3 drifting orbs + grid + vignette, reduced-motion aware), top-bar.tsx (brand + engine status pill + COI badge), footer.tsx (sticky via mt-auto).
- Engine UI: engine-boot-panel.tsx (boot button state machine, stage checklist, live terminal console w/ auto-scroll, transfer bar: real % during fetch / shimmer during compile, post-boot stats), system-status-hud.tsx (6 runtime probes).
- Dashboard: tool-grid.tsx — registry-driven Tool Matrix, 23 tools across phases 2–7, category filter rail w/ layoutId pill animation, lock states + phase chips + toasts. Registry at src/lib/tools/registry.ts (single source of truth; phases flip status→online later).
- page.tsx: single-canvas architecture on "/" (sandbox constraint + Capacitor-friendly), FFmpegEngineProvider mounted once.
- Types: src/types/omni.ts. Helpers: src/lib/format.ts.

Stage Summary:
- E2E VERIFIED via agent-browser: engine boots ONLINE in ~1.12s, downloads 30.7MB WASM with real progress, crossOriginIsolated=true, SAB available, 0 console errors, filters + toasts + responsive layout OK. Screenshots: download/phase1-engine-online.png, download/phase1-mobile.png.
- Lint clean. Dev server healthy on :3000.
- Architecture notes for next phases: consume engine via useFFmpeg() (engine non-null when state==="ready"); tools render inside the single-canvas shell via client view-routing; registry entries flip status to "online" when implemented; keep all engine file I/O virtual (ffmpeg FS) then hand off to Vault (IndexedDB, Phase 5).
- PAUSED — awaiting user confirmation to begin PHASE 2 (Video & Visual Engine).

---
Task ID: 2
Agent: Super Z (principal engineer, main agent)
Task: PHASE 2 — The Video & Visual Engine (Media Converter, Video Compressor, Video Mute, GIF Maker)

Work Log:
- Verified codec availability by grepping wasm binary: libx264, libvpx, libmp3lame, libvorbis, libopus all present.
- Infra: src/lib/navigation/nav-store.ts (zustand view router for single-canvas SPA), src/lib/media/probe.ts (browser-native video/audio metadata probe), src/lib/media/ffmpeg-jobs.ts (MIME map, ext/baseName helpers, 300MB warn / 900MB block guards).
- Job runner: src/hooks/use-media-job.ts — declarative JobSpec {write[], passes[], read[], cleanup[]}; per-pass progress via engine.on("progress") with overall = (passIdx + ratio)/totalPasses; elapsed timer; exit-code check (ret!==0 throws with pass label); best-effort virtual FS cleanup; blob URL lifecycle (revoke on reset/unmount). Fixed TDZ closure + passCount state defects during self-review.
- UI primitives: drop-zone.tsx (drag&drop w/ depth counter, sr-only input for a11y+uploads, derived previewUrl via useMemo + revoke cleanup, file-identity-guarded probe results — refactored to satisfy react-hooks/set-state-in-effect), processing-status.tsx (phase/progress/pass chips/error), output-card.tsx (player by kind + download + badges).
- Tools: media-converter.tsx (video formats mp4/mov/mkv=x264+aac+faststart, avi=mpeg4+mp3, webm=vp8+vorbis realtime; audio extraction mp3/wav/m4a/flac/ogg), video-compressor.tsx (CRF 18-38 slider, resolution cap via scale=-2:'min(ih,H)' no-upscale, audio toggle, savings stats source/output/saved), video-mute.tsx (-c copy -an instant path + x264 fallback on failure), gif-maker.tsx (2-pass palettegen=stats_mode=diff → paletteuse bayer dither, time range sliders + presets, fps/width/loop).
- Integration: tool-shell.tsx (engine gate w/ inline boot), app-shell.tsx (AnimatePresence view switching, TOOL_COMPONENTS registry map), dashboard-view.tsx (extracted from old page), registry 4 tools→online, tool-grid navigates online tools, topbar/footer phase 2/7.
- E2E via agent-browser with system-ffmpeg-generated fixture (testsrc2 480x320 6s + 440Hz sine, H.264+AAC):
  1) Converter video→MP4: playable, readyState 4, 6s ✓; audio→MP3: 6.01s readyState 4, 143KB ✓
  2) Compressor: 709KB→538KB −24%, 1.16s ✓
  3) Mute: instant stream-copy badge, playable ✓
  4) GIF: 2-pass, 1.6MB 480x320 renders ✓
- Bugs found & fixed during E2E: (a) app-shell imported non-existent `reset` export (module-level import instead of store method) → 500 SSR error; (b) palettegen option typo stat_mode→stats_mode reproduced & confirmed via system ffmpeg; (c) lint rule react-hooks/set-state-in-effect → refactored DropZone to derived-URL pattern.
- Lint clean. Fresh-reload console: 0 errors. Screenshot: download/phase2-gif-maker.png. Fixture: scripts/omni-test.mp4.

Stage Summary:
- 4 Phase-2 modules LIVE and browser-verified end-to-end. Tool Matrix shows "4 live".
- Patterns established for Phase 3+: useMediaJob(JobSpec) is the single way tools drive ffmpeg; multi-pass jobs supported (progress split per pass); DropZone+OutputCard+ProcessingStatus are the tool UI kit; ToolShell gates on engine; new tools = registry online flip + TOOL_COMPONENTS entry + module component.
- Audio note for Phase 3: audio filter chains (atempo/areverse/apad/stereotools/equalizer) compose into passes[0].exec as -af strings; engine stays hot between tools.
- PAUSED — awaiting user confirmation to begin PHASE 3 (Advanced Audio Engineering Suite).
