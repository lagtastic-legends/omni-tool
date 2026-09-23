# Changelog

All notable changes to ZenoDeck are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.2.0] — 2026-09-22

### Added
- **UnifiedLoginCard component** — single shared authentication card used by both `AuthGuard` and `AuthGateway`, eliminating ~400 lines of duplicated login UI code
- **Full-page Google redirect sign-in** (`signInWithRedirect`) as a persistent fallback when popup windows are blocked by the browser or cross-origin cookie policies
- **"Having popup issues?" link** — always-visible redirect fallback below the primary Google sign-in button
- **Dismissible error banners** with an `X` close button so auth errors don't permanently block the login UI
- **Android Credential Manager** with automatic graceful fallback to legacy `signInWithGoogle` for pre-Android 14 devices

### Changed
- **Responsive phone ergonomics**: 44px+ minimum touch targets on all interactive elements (Apple HIG / Material 3 compliant)
- **iOS Safari zoom prevention**: mobile inputs now use `text-base` (16px) font-size, preventing unsolicited viewport zoom
- **Flip phone flex mode support**: login card uses `max-h-[calc(100dvh-4rem)]` with `overflow-y-auto overscroll-contain` for 90° tabletop mode
- **Mobile keyboard optimization**: email fields use `inputMode="email"` + `autoComplete="email"` to surface the correct keyboard
- **Auto-navigation on login**: `addAndSelectAccount`, `switchAccount`, and `continueAsGuest` now programmatically navigate from `auth-gateway` to `dashboard`
- Replaced legacy Tailwind tokens: `text-on-primary` → `text-primary-foreground`, `font-headline` → `font-display`
- Bumped Android `versionCode` to `320` and `versionName` to `"3.2.0"`

### Removed
- **Hardcoded mock accounts** (`DEFAULT_SUGGESTED_ACCOUNTS` with `demo.user1@zenodeck.app`) — the saved accounts list now starts empty and only contains genuine accounts the user has signed in with

### Fixed
- **Stuck login page after OAuth**: view remained on `auth-gateway` after successful popup/redirect sign-in because `navigate("dashboard")` was never called
- **Cross-tab OAuth failure**: mobile browsers opening popups as unlinked tabs (`window.opener === null`) no longer results in a dead login — redirect flow and direct Gmail entry provide 100% coverage
- **`signInWithGoogleRedirect`** now handles `auth/unauthorized-domain` with a user-friendly error message instead of a raw Firebase exception

---

## [3.1.1] — 2026-09-21

### Changed
- Published Play Store AAB and signed APK via GitHub Actions release workflow
- Version bump to align web and Android releases

---

## [3.1.0] — 2026-09-20

### Added
- **Video Editor Phase 1**: Web desktop NLE with 9 studio-grade transitions, JKL shuttle transport, keyboard shortcuts, seam badges, and live viewport simulation
- **Video Editor Phase 2**: Native mobile workstation with hardware posture detection (slab, flip 90°, foldable dual-pane, tablet), tactile jog wheel, razor blade slash animation, and ergonomic single-thumb deck
- **Background Processing**: Screen Wake Lock Controller prevents CPU throttling and display sleep during exports
- **Unified Notification Engine**: Native Android notifications + Web push alerts on job completion
- **Android 13+ Scoped Storage Fix**: Resolved permission dialog loops on API 33+
- Production-ready PWA, signed APK, and Play Store AAB

---

## [3.0.0] — 2026-09-18

### Added
- Complete Next.js 16 migration (App Router)
- Tailwind CSS v4 design system overhaul
- 13-engine audio DSP suite with dual Web Audio + FFmpeg WASM pipeline
- 20 GB zero-copy WORKERFS streaming engine
- WebCodecs + WebGL 2.0 hardware-accelerated video pipeline
- Capacitor 8 native Android shell with edge-to-edge insets
- Tactile UI audio synthesis engine (in-memory PCM, 0ms latency)

[3.2.0]: https://github.com/lagtastic-legends/zenodeck/compare/v3.1.1...v3.2.0
[3.1.1]: https://github.com/lagtastic-legends/zenodeck/compare/v3.1.0...v3.1.1
[3.1.0]: https://github.com/lagtastic-legends/zenodeck/compare/v3.0.0...v3.1.0
[3.0.0]: https://github.com/lagtastic-legends/zenodeck/releases/tag/v3.0.0
