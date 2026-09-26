# ZenoDeck v3.4.5 — Universal Android Permissions & Unified Release APK

> **Release Date:** September 26, 2026  
> **Tag:** `v3.4.5`  
> **Repository:** [lagtastic-legends/zenodeck](https://github.com/lagtastic-legends/zenodeck)  
> **Direct APK Download:** `releases.apk`  

---

## 🚀 Overview

**ZenoDeck v3.4.5** resolves Android runtime permission prompts across all Android OS versions (Android 9 through Android 15) and consolidates release distribution to a single, unambiguous asset: **`releases.apk`**.

---

## 📦 What's New in v3.4.5

### 🛡️ 1. Universal Runtime Permission Architecture (Android 9–15)
- **WebChromeClient Permission Interception Fixed**: Removed the raw `request.grant(...)` bypass in `MainActivity.java` that previously prevented Capacitor's `permissionLauncher.launch(permissions)` from triggering Android's native OS dialog for Camera and Microphone.
- **Version-Aware Permission Dispatcher**: Implemented dynamic permission negotiation in `OmniRecorderPlugin.java`:
  - **Android 13+ (API 33+)**: Automatically requests `POST_NOTIFICATIONS` and handles modern granular media permissions.
  - **Android 9–12 (API 28–32)**: Automatically requests `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE`.
- **Legacy Storage Support**: Added `android:requestLegacyExternalStorage="true"` to `AndroidManifest.xml` for legacy file writes on Android 10/11.
- **Fail-Safe File Storage**: `nativeSave` first targets `Directory.Documents`, and if restricted by aggressive OEM security rules, automatically falls back to app-internal `Directory.Data` so generated media is never lost.
- **Interactive Permission Center**: Modernized `PermissionGate` dialog allowing one-tap "Grant Permissions" batch requests or granular per-permission activation.

### 📱 2. Single Unified Release Asset: `releases.apk`
- **Streamlined User Experience**: Removed confusing duplicate assets (`.aab`, redundant release name aliases). Android users now have one clean, universal APK download: **`releases.apk`**.
- **Automated CI/CD**: Updated `.github/workflows/release.yml` to package and publish strictly `releases.apk`.

---

## 🧪 Verification & Automated Checks

- **TypeScript Typecheck**: Passing with 0 errors (`npx tsc --noEmit`).
- **YouTube Engine Test Suite**: 65 / 65 automated tests passing cleanly.
- **Android Release Packaging**: Signed production APK compiled with target SDK 36 and Android version code 345 (`3.4.5`).
