# ZenoDeck v3.4.7 — In-App Auto-Updater, YouTube Playlist Downloader, ID3v2.3 Album Art Tagger, & Background Notifications

> **Release Date:** September 26, 2026  
> **Tag:** `v3.4.7`  
> **Repository:** [lagtastic-legends/zenodeck](https://github.com/lagtastic-legends/zenodeck)  
> **Direct APK Downloads:**  
> - [**`zenodeck.apk`**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.4.7/zenodeck.apk) (Universal Latest Release)  
> - [**`zenodeck-v3.4.7.apk`**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.4.7/zenodeck-v3.4.7.apk) (Versioned Release Archive)  
> - [**Direct Web Mirror**](https://omni-tool-two.vercel.app/zenodeck.apk)  

---

## 🚀 Overview

**ZenoDeck v3.4.7** delivers major workflow enhancements for native Android and Web users:
1. **In-App Auto-Update Checker & One-Tap Installer**: Real-time GitHub Releases polling, update notifications, direct APK background downloads, and automated Android package installer execution.
2. **YouTube Playlist & Batch Downloader**: Download entire playlists or select specific tracks in one batch, with custom quality presets and sequential queue management.
3. **Zero-Dependency ID3v2.3 MP3 Tagger**: Native client-side metadata tagging that embeds high-resolution album cover art, song title, channel/artist, and year directly into downloaded MP3 audio files.
4. **Android Background Notification Progress**: Real-time progress bar in the Android system drawer showing transfer speeds and download status.
5. **Universal Granular Permissions**: Robust handling of `Photos & Videos` and `Music & Audios` permissions across Android 9 through Android 15+.

---

## 📦 What's New in v3.4.7

### 🔄 1. In-App Auto-Update Checker & Native APK Installer
- **Automatic GitHub Release Polling**: ZenoDeck checks for newer releases upon launch and via the settings menu without needing Google Play Services.
- **Update Modal & Release Notes**: View release highlights, version tags, and package details directly inside the application.
- **One-Tap Background Download & Install**: Downloads the updated APK in the background and launches Android's native package installer via `FileProvider` (`REQUEST_INSTALL_PACKAGES`).

### 📑 2. YouTube Playlist & Batch Downloader
- **Intelligent Playlist Parser**: Paste any YouTube playlist URL (`list=...`) or mix URL to fetch the full track list.
- **Interactive Batch Deck**: Select/unselect items, choose audio or video formats (1080p, 720p, 320kbps MP3, AAC), and initiate batch downloads.
- **Queue Engine**: Sequential worker processing with pause, resume, cancel, and individual progress bars.

### 🎵 3. Zero-Dependency ID3v2.3 MP3 & Album Art Tagger
- **Binary ID3v2.3 Encoder**: Zero-overhead frame encoder writing standard ID3 frames (`TIT2`, `TPE1`, `TALB`, `TYER`, `APIC`).
- **High-Res Cover Art**: Fetches high-quality YouTube thumbnail artwork and embeds it directly into the MP3 ID3 header.
- **Library Compatible**: Instant recognition of title, artist, and album art in Android music players, iOS Files, Windows Media Player, and car audio systems.

### 🔔 4. Android Status Bar Background Notifications
- **Status Bar Progress Bar**: Shows active download percentage and real-time transfer speed (MB/s) in the notification drawer.
- **Completion Chime**: Notification alert when batch or single file downloads complete.

### 📱 5. Granular Android Media Permissions
- **Photos & Videos (`READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO`)**: Declared and managed across Android 13+ with partial selection (`READ_MEDIA_VISUAL_USER_SELECTED`) on Android 14+ (API 34+), with automated fallback to `READ_EXTERNAL_STORAGE` on Android 12 and below.
- **Music & Audios (`READ_MEDIA_AUDIO`)**: Dedicated audio access on Android 13+ and `READ_EXTERNAL_STORAGE` fallback on legacy Android versions.
- **In-App Device Permissions Dialog**: View real-time OS permission grants and request individual or batch access in one tap.

---

## 🔒 Verification & Package Checksums

| File | Size (Bytes) | SHA-256 Checksum |
| :--- | :--- | :--- |
| **`zenodeck.apk`** | 25,211,132 | `FEBBA3316CA37BB72EB7F508F16F42DF1ED9D8B80C5E962B1633DD73E1E0685A` |
| **`zenodeck-v3.4.7.apk`** | 25,211,132 | `FEBBA3316CA37BB72EB7F508F16F42DF1ED9D8B80C5E962B1633DD73E1E0685A` |

- **TypeScript Compilation**: Passed with 0 errors (`npx tsc --noEmit`).
- **YouTube Test Suite**: 65 / 65 automated tests passing cleanly (`scripts/test-youtube-suite.ts`).
- **ID3 Tagger Test Suite**: 5 / 5 automated tests passing cleanly (`scripts/test-id3-tagger.ts`).
- **Updater Test Suite**: 8 / 8 automated tests passing cleanly (`scripts/test-updater.ts`).
- **Playlist Test Suite**: 6 / 6 automated tests passing cleanly (`scripts/test-playlist-resolver.ts`).
- **Android Target**: Compiled with Android SDK 36 (target API 36, min API 28) signed with release keystore.
