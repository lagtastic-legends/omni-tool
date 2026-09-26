# ZenoDeck v3.4.2 — Native On-Device Resolution, Cloud Anti-Bot Resilience & Verified 4K Turbo Engine

> **Release Date:** September 26, 2026  
> **Tag:** `v3.4.2`  
> **Repository:** [lagtastic-legends/zenodeck](https://github.com/lagtastic-legends/zenodeck)  
> **Live Web Application:** [https://omni-tool-two.vercel.app](https://omni-tool-two.vercel.app)  
> **Direct APK Download:** [https://omni-tool-two.vercel.app/zenodeck.apk](https://omni-tool-two.vercel.app/zenodeck.apk)

---

## 🚀 Overview

**ZenoDeck v3.4.2** brings enterprise-grade network resilience to the YouTube 4K Downloader and across the entire media suite. Addressing modern anti-bot IP blocks and CDN node timeouts, v3.4.2 establishes a **direct on-device resolution pipeline** for Android devices, implements **multi-candidate CDN node failover routing**, introduces a **user-friendly cloud anti-bot alert system with direct sideloading**, and achieves **100% green status across a 65-point automated regression test harness**.

---

## 📦 What's New in v3.4.2

### 📱 1. Native On-Device Resolution for Android (`CapacitorHttp`)
- **Zero Cloud Datacenter IP Blocks**: The Android APK now runs stream resolution (`resolveYouTubeVideo`) directly on the device using native Android OS network connections. It uses your device's trusted mobile carrier (4G/5G) or home Wi-Fi network, completely immune to YouTube's cloud datacenter IP blacklists (AWS/Vercel).
- **Direct Google CDN Acceleration**: Bypasses serverless proxy hops for media streaming. Stream chunks flow directly from Google's high-speed CDN to the device with 4–8 parallel workers.

### 🌐 2. Multi-Candidate Failover Architecture (`buildCandidateUrls`)
- **Fallback Node Routing**: Built-in candidate host resolution parses embedded `mn` and `fallback_host` edge cache nodes from YouTube manifests, ensuring zero connection timeouts if an ISP edge node is congested.
- **Continuous Chunk Partitioning**: Guarantees zero byte gaps and zero overlapping bytes across multi-threaded download ranges (`Range: bytes=X-Y`).

### 🛡️ 3. Studio-Grade Cloud Anti-Bot Guidance & Direct APK Sideloading
- **Actionable UX**: Replaced cryptic raw technical errors (`[IOS_NO_GL: LOGIN_REQUIRED...]`) with a polished, informative notification explaining YouTube's cloud datacenter restrictions.
- **1-Tap Sideloading**: Prominently features a direct download button for `zenodeck.apk` right inside the alert card for instant, unrestricted on-device processing.

### 🧪 4. 65-Point Automated Regression Suite
- **Comprehensive Test Harness (`scripts/test-youtube-suite.ts`)**:
  - **URL Parsing**: 14 test cases across standard, short, embeds, shorts, music, query params, whitespace, and negative cases.
  - **Formatters**: 10 test cases validating duration standard timestamps (`0:00`, `0:45`, `2:05`, `5:01`, `1:01:05`) and byte formatting.
  - **Visitor Session Tokens**: Validates token generation from YouTube's `visitor_id` endpoint.
  - **InnerTube Multi-Client Resolution**: Live validation of both video formats (1080p, 720p, 480p) and all 6 audio extraction tiers (320k, 256k, 192k, 128k, Native AAC, Lossless WAV).
  - **CDN Range Streaming**: Validates HTTP 206 partial content range chunk downloads.
  - **Next.js Route Handlers**: Verifies `/api/youtube/info` dynamic endpoint integrity.
- **100% Green Status**: 65 / 65 automated tests passing with zero errors.

---

## 📱 Release Assets

| Asset Name | Target Platform | Type | Description |
| :--- | :--- | :--- | :--- |
| **`ZenoDeck-v3.4.2-release.apk`** | Android 7.0+ (Phones & Tablets) | Signed Release APK (v3.4.2) | Production signed APK with native on-device resolution and direct CDN streaming. |
| **`zenodeck.apk`** | Web Host Mirror | Direct Fast Download | Mirrored directly on `https://omni-tool-two.vercel.app/zenodeck.apk`. |
| **`zenodeck.mobileconfig`** | Apple iOS / iPadOS | Web Clip Profile | Apple Configuration Profile for home-screen standalone web app installation. |
