# ZenoDeck v3.2.0 — Enterprise Login & Universal Phone Authentication

> **Release Date:** September 23, 2026  
> **Tag:** `v3.2.0`  
> **Repository:** [lagtastic-legends/zenodeck](https://github.com/lagtastic-legends/zenodeck)  
> **Live Web Application:** [https://omni-tool-two.vercel.app](https://omni-tool-two.vercel.app)  
> **Direct APK Download:** [https://omni-tool-two.vercel.app/zenodeck.apk](https://omni-tool-two.vercel.app/zenodeck.apk)

---

## 🚀 Overview

**ZenoDeck v3.2.0** delivers a ground-up architectural overhaul of the identity and authentication subsystem, engineered with senior system design principles for 100% reliability across every device category — from compact slabs and flip phones (in 90° flex mode) to foldables, tablets, and desktop workstations.

---

## 📦 What's New in v3.2.0

### 🔐 1. Multi-Tier Google Authentication Engine
- **UnifiedLoginCard Architecture:** Single unified, battle-tested component shared between the `AuthGuard` security gate and the `AuthGateway` identity management portal, eliminating 400+ lines of duplicated code.
- **5-Tier Authentication Failover Protocol:**
  1. **Tier 1 (Android Native):** Google Credential Manager (Android 14/15) with automatic seamless fallback to legacy Google Play Services sign-in dialog.
  2. **Tier 2 (Web Primary):** Google OAuth 2.0 popup with `prompt: "select_account"`, ensuring users can always choose among multiple Google accounts.
  3. **Tier 3 (Web Fallback):** Full-page `signInWithRedirect` flow that navigates directly through Google Accounts, immune to mobile browser popup blockers and partitioned third-party cookies.
  4. **Tier 4 (Direct In-Tab Gmail):** Zero-friction direct email entry form that operates completely client-side without external redirects, ideal for corporate intranets or restricted networks.
  5. **Tier 5 (Offline Guest Sandbox):** Instant 1-tap bypass granting immediate access to all 20+ WebAssembly media and document tools with zero network requests or login credentials.
- **Zero Mock Users:** Fully eradicated hardcoded demo accounts. The device account switcher exclusively lists accounts genuinely authenticated on that physical hardware.
- **Auto-Navigation Fix:** Logging in, switching accounts, or entering guest mode now programmatically navigates immediately to the Dashboard (`dashboard`), permanently resolving the "stuck on login page" issue.

### 📱 2. Universal Phone Ergonomics (All Form Factors)
- **Compact Slabs (360px–390px):** Guaranteed $\ge 44\text{px}$ touch targets meeting WCAG 2.5.5 and Apple HIG specifications, with responsive card padding (`p-4 xs:p-5 sm:p-7`) preventing horizontal text truncation.
- **Flip Phones (Flex / Tabletop Mode):** Container constrained by `max-h-[calc(100dvh-4rem)]` with `overflow-y-auto overscroll-contain`, ensuring all controls remain fully accessible when folded at a 90° angle.
- **Foldables & Tablets:** Perfectly balanced `max-w-md` centered elevation with subtle obsidian glow, preventing awkward full-screen stretching on wide aspect ratio inner screens.
- **iOS Safari Viewport Zoom Prevention:** Mobile inputs standardized to `text-base` (16px), eliminating unsolicited browser zooming on form focus.
- **Keyboard Optimization:** `inputMode="email"` and `autoComplete="email"` surface the appropriate mobile keyboard layouts immediately.
- **Dismissible Notices:** Auth error banners now feature quick-dismiss `X` buttons and inline action buttons ("Try Full-Page Google Sign-In" and "Bypass as Guest").

### 🎵 4. Studio-Grade Video to Audio Extraction
- **Packet Resynchronization (`aresample=async=1000`):** Eliminates audio packet jitter and timestamp micro-gaps when stripping video containers, permanently curing robotic voice stutter and glitchy audio dropouts.
- **Vocal Channel Downmixing:** Standardized stereo downmix (`-ac 2`, `aformat=channel_layouts=stereo`) properly folds 5.1/7.1 Center dialogue channels into stereo Left/Right, ensuring speech is loud, punchy, and clear without phase cancellation.
- **True-Peak Limiter Protection:** `alimiter=limit=0.98` prevents inter-sample digital clipping during lossy MP3/AAC encoding on loud vocal sections.
- **320 kbps Studio Option & Visual Trimming:** Added 320 kbps high-fidelity bitrate option, standardized 44.1kHz output, and unlocked the visual waveform trimmer directly within audio extraction workflows.

### 🔊 5. Anti-Tearing Bass Booster & Refined Acoustic Tier Grid
- **Subsonic Rumble Protection (28 Hz):** High-pass filter removes inaudible sub-30Hz DC rumble that overloads speakers and triggers limiter pumping without contributing to audible bass.
- **Butterworth Low-Shelf Response (Q=0.707):** Natural, smooth low-frequency shelf without resonant ringing or phase distortion.
- **Dynamic Headroom Attenuation:** Automatically scales pre-gain down by ~38% of boost amount so the signal never exceeds the digital 0 dBFS ceiling.
- **Auto-Sub-Band Control (ASC) Lookahead Limiter:** Multi-band limiting (`alimiter=...:asc=1`) prevents heavy bass transients from choking or tearing mid-range vocals.
- **Refined 5-Tier Acoustic Preset Grid:**
  - **Tier 1 (Warmth):** +3.0 dB @ 110 Hz · Transparent analog warmth
  - **Tier 2 (Punchy):** +6.0 dB @ 95 Hz · Tight kick drum & bass attack
  - **Tier 3 (Deep Club):** +9.0 dB @ 80 Hz · Room-filling dance & EDM sub
  - **Tier 4 (Heavy Sub):** +12.0 dB @ 65 Hz · 808 boom & trap sub pressure
  - **Tier 5 (Earthquake):** +15.0 dB @ 55 Hz · Maximum physical impact with zero tearing

### 🧹 6. Design System & Token Polish
- Replaced legacy tokens (`text-on-primary` → `text-primary-foreground`, `font-headline` → `font-display`) across `top-bar.tsx` and `ascii-generator.tsx`.
- Updated release version indicators to `v3.2.0` (Android `versionCode 320`).

---

## 📥 Release Assets

| Asset | Platform | Type | Description |
| :--- | :--- | :--- | :--- |
| **`ZenoDeck-v3.2.0-release.aab`** | Google Play Store | Android App Bundle | Production-signed bundle (Target SDK 36, Android 15+) ready for Play Console |
| **`ZenoDeck-v3.2.0-release.apk`** | Android 7.0+ | Native APK | Dual-signed (v1 + v2) release APK for direct installation & sideloading |
| **Source Code** | All platforms | `.zip` / `.tar.gz` | Full source code of the release |

---

## 🔒 Privacy & On-Device Security

ZenoDeck operates **100% on-device** using client-side WebAssembly (FFmpeg WASM), WebCodecs, WebGL 2.0, and the Web Audio API. No documents, media files, audio streams, or user credentials ever leave your device.
