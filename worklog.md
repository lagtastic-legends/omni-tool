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

---
Task ID: 3
Agent: Super Z (principal engineer, main agent)
Task: PHASE 3 — The Advanced Audio Engineering Suite (9 audio modules)

Work Log:
- Verified all required libavfilter filters in wasm binary: apulsator, stereotools, areverse, atempo, asetrate, aresample, aecho, equalizer, dynaudnorm, extrastereo, afade, atrim, asetpts + ffprobe support.
- Built src/lib/audio/filters.ts — pure filter-graph builders: slowedFilters (asetrate pitch-drop + tiered aecho), bassFilters, spatialFilters (extrastereo+apulsator sine), eqFilters (6-band Q=1 peaking, zero-gain bands skipped), reverseFilters, panFilters, volumeFilters (volume/dynaudnorm), trimFadeFilters (atrim+asetpts+afade), editorFilters (combined chain w/ final-length projection), audioOutputArgs (mp3/wav/flac/ogg/m4a encoders).
- Built src/lib/audio/probe.ts — detectSampleRate via engine.ffprobe (-show_entries stream=sample_rate -o scratch file, parse, cleanup, fallback 44100).
- Built audio UI kit: param-controls.tsx (ParamSlider/ParamSelect/ParamToggle/ParamPanel), audio-workbench.tsx (2-col layout, decorative animated bar strip, internal format+bitrate bar, onRun(format,kbps,outputArgs) contract).
- Extended DropZone: preview="audio" now probes duration via probeAudioDuration → onProbed (for range UIs).
- 9 tools: slowed-reverb (stages input itself for pre-run sr probe), bass-booster (+clarity shelf), spatial-8d, equalizer-tool (preset chips), reverse-audio, stereo-panner (center-snap, disabled at 0), volume-changer (normalize toggle), ringtone-maker (trim/fades/boost, M4R-M4A-MP3-OGG, 40s iOS warn), audio-editor (flagship: trim+reverse+speed+volume/normalize+fades, live timeline projection strip w/ final length + filter count + dirty state).
- Integration: registry 9 audio tools → online (13 total), app-shell TOOL_COMPONENTS +9 imports, topbar v0.3 · PHASE 3/7, footer audio engineering suite.
- E2E via agent-browser with stereo tremolo mp3 fixture (12s, 44.1k):
  1) slowed-reverb: output 14.30s = 12/0.85 ✓ (sr probe + asetrate chain confirmed; earlier confusion was eval selecting input preview element)
  2) bass-booster: ✓ after fixing t=0.8 → t=q:w=0.8 (t is width_type enum in bass/treble)
  3) spatial-8d: ✓ 4) equalizer preset: ✓ 5) reverse: ✓
  6) stereo-panner: ✓ after fixing stereotools=balance → balance_out (modern ffmpeg split the option)
  7) volume +6dB: ✓
  8) ringtone M4R: ✓ after adding -f ipod (ffmpeg cannot guess muxer from .m4r extension)
  9) audio-editor: 12.00→8.00s combined (trim 10s ÷ 1.25 speed, reversed, 4 filters) — output duration EXACTLY matches live projection
- All remaining chains pre-validated with system ffmpeg before browser re-tests (batch script, 0 errors).
- Lint clean. Console errors 0. Screenshot: download/phase3-audio-editor.png.

Stage Summary:
- 9 Phase-3 modules LIVE and browser-verified; Tool Matrix: 13 live / 23.
- ffmpeg filter-option lessons recorded in code comments (width_type enums, balance_out, -f ipod for m4r).
- Patterns for Phase 4: pdf-lib + canvas tools are engine-independent (no FFmpeg); registry flips + TOOL_COMPONENTS entries remain the integration path; AudioWorkbench pattern reusable if more effect tools appear.
- PAUSED — awaiting user confirmation to begin PHASE 4 (Document & Image Toolkit).
