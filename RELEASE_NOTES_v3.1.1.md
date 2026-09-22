# ZenoDeck v3.1.1 — Production Play Store & Web PWA Release

> **Release Date:** September 22, 2026  
> **Tag:** `v3.1.1`  
> **Repository:** [lagtastic-legends/zenodeck](https://github.com/lagtastic-legends/zenodeck)  
> **Live Web Application:** [https://omni-tool-two.vercel.app](https://omni-tool-two.vercel.app)  
> **Direct APK Download:** [https://omni-tool-two.vercel.app/zenodeck.apk](https://omni-tool-two.vercel.app/zenodeck.apk)

---

## 🚀 Overview

**ZenoDeck v3.1.1** prepares the entire platform for public distribution across both native Android channels (Google Play Store and direct APK sideloading) and web channels (standalone PWA and direct web downloads).

---

## 📦 What's Included in v3.1.1

### 1. 📱 Google Play Store Production Bundle (`.aab`)
- **Format:** Android App Bundle (`app-release.aab`) built with Target SDK 36 (Android 15+).
- **Keystore Signature:** Cryptographically signed using `omnitool-release.keystore` (alias: `omnitool`, valid until 2054).
- **Play Store Security Hardening:** Disabled WebView debugging (`webContentsDebuggingEnabled: false`) to satisfy Google Play Protect requirements and prevent reverse inspection in release builds.
- **Backwards Compatibility:** Minimum SDK 24 (Android 7.0+), supporting 99%+ of active Android devices worldwide.

### 2. ⚡ Dual-Signed Android Release APK (`.apk`)
- **Direct Web Distribution:** Packaged and hosted on the web app for instant download via `https://omni-tool-two.vercel.app/zenodeck.apk`.
- **Dual Scheme Signing:** Both APK Signature Scheme v1 (JAR signing) and Scheme v2 enabled for rock-solid installation integrity.

### 3. 🌐 Progressive Web App (PWA) Engine
- **Service Worker (`public/sw.js`):** Lightweight background service worker providing instant asset caching and offline shell availability.
- **Web App Manifest (`public/manifest.webmanifest`):** Standard compliant manifest with full PNG icon suite (48x48 up to 512x512 with maskable attributes).
- **In-App Install Modal (`AppDownloadModal`):** Accessible via Top Bar, Dashboard Hub hero CTA, and Footer:
  - 1-Click PWA Browser Installation.
  - 1-Click Direct Android APK Download.
  - 1-Click iOS Web Clip Profile (`/api/ios-profile`).

### 4. 🛠️ Build & CI Pipeline Upgrades
- **Static Export Fix:** Resolved file vs folder collision for `out/api` during `MOBILE_EXPORT=1` builds by migrating API routes to static endpoints.
- **Dual Artifact Release CI:** GitHub Actions release workflow now automatically builds and attaches both `ZenoDeck-v3.1.1-release.apk` AND `ZenoDeck-v3.1.1-release.aab` to every GitHub release.

---

## 📥 Release Assets

| Asset | Platform | Type | Description |
| :--- | :--- | :--- | :--- |
| **`ZenoDeck-v3.1.1-release.aab`** | Google Play Store | Android App Bundle | Signed production bundle ready for Google Play Console upload |
| **`ZenoDeck-v3.1.1-release.apk`** | Android 7.0+ | Native APK | Dual-signed release APK for direct sideloading and web distribution |
| **Source Code** | All platforms | `.zip` / `.tar.gz` | Full source code of the release |

---

## 🔒 Privacy & On-Device Security

ZenoDeck operates **100% on-device** using WebAssembly. No files, video streams, or audio tracks are ever uploaded to remote servers.
