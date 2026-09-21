# ZenoDeck v3.1.0 — Milestone Release: Multi-Platform Video Workstation & Background Engine

> **Release Date:** September 21, 2026  
> **Tag:** `v3.1.0`  
> **Repository:** [lagtastic-legends/zenodeck](https://github.com/lagtastic-legends/zenodeck)  
> **Live Web Application:** [zenodeck.vercel.app](https://zenodeck.vercel.app)

---

## 🎬 Welcome to ZenoDeck v3.1.0

**ZenoDeck v3.1.0** delivers a comprehensive evolution to the **Video Editor Studio**, expanding from a browser workstation to a native touch-first mobile application optimized for every modern phone form factor (Slabs, Flips, Foldables, and Tablets).

Combined with an all-new **Screen Wake Lock Background Engine**, a **Unified Notification System**, and full compliance with modern **Android 13+ Scoped Media Storage**, this milestone sets a new benchmark for on-device, private media production.

---

## 🚀 What's New in v3.1.0

### 1. 🎥 Video Editor Phase 1: Web App Workstation & Transitions Engine
- **Frame-Accurate Transitions Engine**:
  - 9 video transitions: Hard Cut (`none`), Cross Dissolve (`fade`), Linear Wipes (`wipeleft`, `wiperight`), Directional Slides (`slideleft`, `slideright`), Lighting Dips (`fadeblack`, `fadewhite`), and Stylized Zoom (`zoomin`).
  - Dynamic `xfade` (video) and `acrossfade` (audio) filtergraph compiler with cumulative timeline offset calculation and safety boundary clamping.
- **Desktop NLE Keyboard Shortcut Matrix**:
  - `Space`: Play/Pause
  - `J` / `K` / `L`: Shuttle Transport (Rewind 2x, Stop, Forward 2x)
  - `S` / `B`: Razor blade split at Current Time Indicator (CTI)
  - `I` / `[` & `O` / `]`: In-point and Out-point trimming
  - `Delete` / `Backspace`: Ripple delete selected segment
  - `Ctrl+Z` / `Cmd+Z`: Multi-level undo history stack
  - `+` / `-`: Timeline zoom in/out
  - `F`: Fit timeline to viewport width
  - `N`: Toggle magnetic snapping
- **Interactive Canvas Seam Badges**:
  - Visual badges (`[ ⧗ 0.5s ]`) rendered directly on Track V1 between sequential clips; clicking any seam node immediately focuses the Transitions Inspector.
- **Live Viewport Simulation Layer**:
  - Real-time CSS blend and exposure flash simulation across cut points during timeline playback and scrubbing.

---

### 2. 📱 Video Editor Phase 2: Mobile APK for All Phone Types
- **Hardware-Aware Device Posture Engine (`useDevicePosture`)**:
  - **Slab Phones (Portrait & Landscape)**: Single-thumb reach zone, sticky bottom action dock, swipeable clip ribbon, and frame-stepping jog wheel.
  - **Flip Phones (Flex Mode / 90° Tabletop)**: Automatically detects folded posture via CSS media queries (`device-posture: folded`) and window geometry. Converts the upper half into an unobstructed cinema preview monitor and the lower half into "The Cockpit" with jog wheel, razor blade, and clip trimmer.
  - **Foldables & Dual-Pane (Samsung Galaxy Z Fold, Pixel Fold, OnePlus Open)**: Unfolded book mode detects inner screen aspect ratios (~4:3 / ~1:1) and renders a side-by-side workstation: left pane master monitor with format scopes; right pane timeline ribbon and inspector panels.
  - **Tablets**: Touch-scaled NLE layout with wide-screen multi-track canvas lanes.
  - **Interactive Posture Switcher**: Instant top-bar mode toggle allows testing Auto, Flex 90°, Fold Dual, Mobile Deck, and Workstation modes on any browser or device.
- **Tactile Mobile Jog Wheel**:
  - Graduated millimeter tick marks with micro-haptic clicks (`haptics.selectionChanged()`) on 30fps frame increments.
  - Quick jump buttons: `-1s`, `-1f`, Play/Pause, `+1f`, `+1s`.
  - Central cyan CTI playhead needle with dynamic timecode readouts.
- **Visual Razor Blade Slash Animation**:
  - High-impact neon blade slash animation cutting diagonally across the video monitor when `Split` is triggered, synchronized with a heavy physical tactile impulse (`haptics.heavy()`).
- **Ergonomic Single-Thumb Deck**:
  - Floating bottom action bay positioned within the natural bottom 120px mobile thumb zone: Undo (with disabled state & history count), In/Out trim markers, center gradient Split Blade, Transitions FX trigger, clip delete, and master export.
- **Mobile Transitions Bottom Sheet**:
  - Fluid drag-to-dismiss bottom sheet showcasing transition presets, haptic duration slider (0.2s–1.5s), and live transition simulation preview button.

---

### 3. ⚡ Background Processing & Screen Wake Lock Controller
- **Android Manifest**: Added `<uses-permission android:name="android.permission.WAKE_LOCK" />`.
- **Screen Wake Lock Controller (`wake-lock.ts`)**:
  - Automatically acquires `navigator.wakeLock.request("screen")` when any conversion, export, or processing job begins in `useMediaJob`.
  - Prevents the mobile screen from sleeping, the CPU from throttling, and the OS from pausing WebAssembly execution during long video exports.
  - Listens to `visibilitychange` to automatically re-acquire the lock if the user leaves and returns to the app while a render is active.
  - Safely releases the lock in `finally` blocks when the job concludes or errors out.

---

### 4. 🔔 Unified Notification Engine (APK & Web App)
- **Android APK (Native Notifications)**:
  - Initializes the high-priority Android channel `zenodeck_jobs` with heads-up display, custom sound, vibration, and cyan notification lights via `@capacitor/local-notifications`.
  - Automatically schedules rich local notifications (`✓ Media Processing Complete - Generated [file.mp4] (48.2 MB). Tap to view and save.`).
- **Web App (Browser Notifications)**:
  - Integrates HTML5 native `Notification` API with ZenoDeck app icon, badge, and vibration. Alerts the user even if they have switched browser tabs or minimized the window.
- **Automatic Integration**:
  - Hooked directly into `useMediaJob`, bringing background wake lock and rich completion alerts to every tool in ZenoDeck.

---

### 5. 🛡️ Fix for Android 13+ Scoped Media Permissions
- Resolved repeated permission dialog loops caused by legacy `publicStorage` checks on Android 13+ (API 33+).
- In `native-save.ts`, safely handles scoped storage writes to `Directory.Documents` without re-prompting.
- In `permission-gate.tsx`, verifies system status on mount and durably persists `"granted"` status in `localStorage` under `zenodeck_permissions_v3`, preventing repeated popups across sessions.

---

## 📦 Downloads & Verification

| Asset | Platform | File Size | Description |
| :--- | :--- | :--- | :--- |
| **ZenoDeck-v3.1.0-release.apk** | Android 8.0+ (ARM64/x86_64) | ~36 MB | Signed release build, ready to install on Android phones, tablets, foldables, and flips |
| **Source Code (zip / tar.gz)** | Cross-platform | — | Full source code for web, mobile, and custom builds |

---

## 🔒 The Zero-Upload Privacy Guarantee

ZenoDeck operates **zero cloud conversion servers**. Your media, private documents, and cryptographic tokens remain strictly on your physical device at all times.
