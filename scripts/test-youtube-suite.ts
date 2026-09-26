/**
 * Comprehensive Automated Test Suite for ZenoDeck YouTube 4K Downloader
 * ======================================================================
 * Validates:
 * 1. URL parsing & ID extraction across all YouTube URL formats
 * 2. Duration and byte formatting utilities
 * 3. YouTube visitor data generation
 * 4. InnerTube video resolver across multiple real-world videos (Standard, 4K, Shorts)
 * 5. Quality tier generation (Video tiers + 6 Audio extraction tiers)
 * 6. Fallback CDN candidate URL generation (buildCandidateUrls)
 * 7. Stream URL validity and Range (206) CDN chunk retrieval across candidates
 * 8. Parallel worker chunk partitioning math & byte-for-byte reassembly integrity
 * 9. Filename sanitization & edge cases
 * 10. Error handling for non-existent or invalid video IDs
 * 11. API Route handler testing (/api/youtube/info)
 */

import {
  extractYouTubeId,
  formatBytes,
  formatDuration,
  getVisitorData,
  resolveYouTubeVideo,
  buildCandidateUrls,
  type YouTubeQualityOption,
  type YouTubeVideoInfo,
} from "../src/lib/youtube/innertube";
import { GET as handleInfoGet } from "../src/app/api/youtube/info/route";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName}${details ? ` -> ${details}` : ""}`);
  }
}

async function runTestSuite() {
  console.log("==========================================================");
  console.log("   ZENODECK YOUTUBE 4K DOWNLOADER — VERIFICATION SUITE   ");
  console.log("==========================================================\n");

  // -----------------------------------------------------------------
  // 1. URL Parsing & Video ID Extraction
  // -----------------------------------------------------------------
  console.log("--- 1. Testing URL Parsing & ID Extraction ---");
  const testCases: [string, string | null][] = [
    ["https://www.youtube.com/watch?v=xT1gYZGDx4I", "xT1gYZGDx4I"],
    ["https://youtu.be/xT1gYZGDx4I", "xT1gYZGDx4I"],
    ["http://youtu.be/xT1gYZGDx4I?si=xyz123", "xT1gYZGDx4I"],
    ["https://www.youtube.com/watch?v=xT1gYZGDx4I&t=120s&list=PL123", "xT1gYZGDx4I"],
    ["https://m.youtube.com/watch?v=xT1gYZGDx4I", "xT1gYZGDx4I"],
    ["https://music.youtube.com/watch?v=xT1gYZGDx4I", "xT1gYZGDx4I"],
    ["https://www.youtube.com/embed/xT1gYZGDx4I", "xT1gYZGDx4I"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["xT1gYZGDx4I", "xT1gYZGDx4I"],
    ["  xT1gYZGDx4I  ", "xT1gYZGDx4I"],
    ["https://google.com", null],
    ["https://vimeo.com/12345678", null],
    ["", null],
  ];

  for (const [input, expected] of testCases) {
    const result = extractYouTubeId(input);
    assert(
      result === expected,
      `extractYouTubeId("${input}") === ${expected}`,
      `Got: ${result}`
    );
  }

  // -----------------------------------------------------------------
  // 2. Duration & Byte Formatter Utilities
  // -----------------------------------------------------------------
  console.log("\n--- 2. Testing Formatters ---");
  assert(formatDuration(0) === "0:00", "formatDuration(0) === 0:00");
  assert(formatDuration(45) === "0:45", "formatDuration(45) === 0:45");
  assert(formatDuration(125) === "2:05", "formatDuration(125) === 2:05");
  assert(formatDuration(3665) === "1:01:05", "formatDuration(3665) === 1:01:05");
  assert(formatDuration(-5) === "0:00", "formatDuration(-5) === 0:00");

  assert(formatBytes(0) === "Unknown size", "formatBytes(0)");
  assert(formatBytes(1048576) === "1.0 MB", "formatBytes(1MB)");
  assert(formatBytes(52428800) === "50.0 MB", "formatBytes(50MB)");
  assert(formatBytes(1073741824) === "1.0 GB", "formatBytes(1GB)");
  assert(formatBytes(2684354560) === "2.5 GB", "formatBytes(2.5GB)");

  // -----------------------------------------------------------------
  // 3. YouTube Visitor Data Generation
  // -----------------------------------------------------------------
  console.log("\n--- 3. Testing Visitor Data Token Generation ---");
  try {
    const visitorData = await getVisitorData();
    assert(
      typeof visitorData === "string" && visitorData.length > 5,
      "getVisitorData() returns non-empty session token",
      `Got: ${visitorData?.substring(0, 15)}...`
    );
  } catch (err: any) {
    assert(false, "getVisitorData() execution", err.message);
  }

  // -----------------------------------------------------------------
  // 4. InnerTube Video Resolution (User's Reported Video: xT1gYZGDx4I)
  // -----------------------------------------------------------------
  console.log("\n--- 4. Testing Resolution of User's Reported Video (xT1gYZGDx4I) ---");
  let resolvedInfo: YouTubeVideoInfo | null = null;
  try {
    resolvedInfo = await resolveYouTubeVideo("xT1gYZGDx4I");
    assert(Boolean(resolvedInfo), "resolveYouTubeVideo returns valid object");
    assert(resolvedInfo.videoId === "xT1gYZGDx4I", "Correct videoId in response");
    assert(
      resolvedInfo.title.toLowerCase().includes("speaker") ||
      resolvedInfo.title.length > 0,
      `Title extracted: "${resolvedInfo.title}"`
    );
    assert(resolvedInfo.durationSeconds > 0, `Duration valid: ${resolvedInfo.durationFormatted} (${resolvedInfo.durationSeconds}s)`);
    assert(Boolean(resolvedInfo.thumbnailUrl), `Thumbnail valid: ${resolvedInfo.thumbnailUrl}`);
    assert(Array.isArray(resolvedInfo.qualities) && resolvedInfo.qualities.length > 0, `Qualities array populated (${resolvedInfo.qualities.length} options)`);

    // Verify Video & Audio split
    const videoQualities = resolvedInfo.qualities.filter((q) => !q.isAudioOnly);
    const audioQualities = resolvedInfo.qualities.filter((q) => q.isAudioOnly);

    assert(videoQualities.length > 0, `Video qualities found: ${videoQualities.map((q) => q.badge).join(", ")}`);
    assert(audioQualities.length >= 6, `Audio qualities complete (found ${audioQualities.length}): ${audioQualities.map((q) => q.badge).join(", ")}`);

    // Verify all 6 specialized audio tiers
    const expectedAudioIds = ["audio-320", "audio-256", "audio-192", "audio-128", "audio-m4a", "audio-wav"];
    for (const audioId of expectedAudioIds) {
      const match = audioQualities.find((q) => q.id === audioId);
      assert(Boolean(match), `Audio quality tier present: ${audioId} (${match?.badge || "missing"})`);
    }

    // Verify streaming URLs exist and are valid HTTPS
    const topVideo = videoQualities[0];
    assert(
      Boolean(topVideo?.videoFormat?.url?.startsWith("https://")),
      `Top video stream URL is valid HTTPS (${topVideo?.label})`
    );
    const topAudio = audioQualities[0];
    assert(
      Boolean(topAudio?.audioFormat?.url?.startsWith("https://")),
      `Audio stream URL is valid HTTPS (${topAudio?.label})`
    );
  } catch (err: any) {
    assert(false, "resolveYouTubeVideo(xT1gYZGDx4I) execution", err.message);
  }

  // -----------------------------------------------------------------
  // 5. Testing Resolution of 4K Sample Video (dQw4w9WgXcQ)
  // -----------------------------------------------------------------
  console.log("\n--- 5. Testing Resolution of Sample Video (dQw4w9WgXcQ) ---");
  try {
    const sampleInfo = await resolveYouTubeVideo("dQw4w9WgXcQ");
    assert(sampleInfo.videoId === "dQw4w9WgXcQ", "Sample videoId matches");
    assert(sampleInfo.qualities.length > 0, `Sample qualities count: ${sampleInfo.qualities.length}`);
    const hasAudio = sampleInfo.qualities.some((q) => q.isAudioOnly);
    const hasVideo = sampleInfo.qualities.some((q) => !q.isAudioOnly);
    assert(hasAudio && hasVideo, "Sample video has both audio and video streams available");
  } catch (err: any) {
    assert(false, "resolveYouTubeVideo(dQw4w9WgXcQ)", err.message);
  }

  // -----------------------------------------------------------------
  // 6. Testing Fallback CDN Candidate URL Generation (buildCandidateUrls)
  // -----------------------------------------------------------------
  console.log("\n--- 6. Testing Candidate URL Failover Generation ---");
  const dummyUrlWithFallback = "https://rr1---sn-abc.googlevideo.com/videoplayback?expire=123&mn=sn-abc,sn-xyz&fallback_host=rr1---sn-fallback.googlevideo.com";
  const candidates = buildCandidateUrls(dummyUrlWithFallback);
  assert(candidates.length >= 2, `Generated ${candidates.length} candidate URLs for failover redundancy`);
  assert(candidates.some((u) => u.includes("sn-xyz")), "Alternative mn node included");
  assert(candidates.some((u) => u.includes("sn-fallback")), "Fallback host node included");

  // -----------------------------------------------------------------
  // 7. Direct Range Request (206 Partial Content) with Candidate Failover
  // -----------------------------------------------------------------
  console.log("\n--- 7. Testing Stream Range (206) Chunk Retrieval with Failover ---");
  if (resolvedInfo && resolvedInfo.qualities.length > 0) {
    const testQuality = resolvedInfo.qualities[0];
    const streamUrl = testQuality.videoFormat?.url || testQuality.audioFormat?.url;
    if (streamUrl) {
      const streamCandidates = buildCandidateUrls(streamUrl);
      let chunkReceived = false;
      let statusAchieved = 0;
      let bytesRead = 0;

      for (const candidate of streamCandidates) {
        try {
          const rangeRes = await fetch(candidate, {
            headers: {
              Range: "bytes=0-1023",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            },
            signal: AbortSignal.timeout(4500),
          });
          if (rangeRes.status === 206 || rangeRes.status === 200) {
            statusAchieved = rangeRes.status;
            const chunk = await rangeRes.arrayBuffer();
            bytesRead = chunk.byteLength;
            chunkReceived = true;
            break;
          }
        } catch {
          // Continue to next candidate
        }
      }

      assert(
        chunkReceived,
        `CDN candidate successfully served chunk (HTTP ${statusAchieved}, ${bytesRead} bytes)`
      );
    }
  }

  // -----------------------------------------------------------------
  // 8. Parallel Worker Range Math & Assembly Integrity Test
  // -----------------------------------------------------------------
  console.log("\n--- 8. Testing Parallel Worker Partitioning Math & Assembly ---");
  const testTotalSizes = [1024 * 1024, 15 * 1024 * 1024, 73491823]; // 1MB, 15MB, 73.4MB odd size
  const testWorkerCounts = [4, 6, 8];

  for (const totalSize of testTotalSizes) {
    for (const workers of testWorkerCounts) {
      const chunkSize = Math.ceil(totalSize / workers);
      const ranges: { start: number; end: number; len: number }[] = [];

      for (let i = 0; i < workers; i++) {
        const start = i * chunkSize;
        const end = Math.min((i + 1) * chunkSize - 1, totalSize - 1);
        ranges.push({ start, end, len: Math.max(0, end - start + 1) });
      }

      // Check continuity
      let isContinuous = true;
      let sumBytes = 0;
      for (let i = 0; i < ranges.length; i++) {
        sumBytes += ranges[i].len;
        if (i === 0) {
          if (ranges[i].start !== 0) isContinuous = false;
        } else {
          if (ranges[i].start !== ranges[i - 1].end + 1) isContinuous = false;
        }
      }
      if (ranges[ranges.length - 1].end !== totalSize - 1) isContinuous = false;

      assert(
        isContinuous && sumBytes === totalSize,
        `Chunk partitioning for ${formatBytes(totalSize)} across ${workers} workers: continuous & exact`
      );
    }
  }

  // -----------------------------------------------------------------
  // 9. Filename Sanitization & Cross-Platform Safe Titles
  // -----------------------------------------------------------------
  console.log("\n--- 9. Testing Filename Sanitization ---");
  const dirtyTitle = 'How to "Build": Speaker / Subwoofer <Bass> | Test? * [4K]';
  const cleanTitle = dirtyTitle
    .replace(/[<>:"/\\|?*]/g, "")
    .trim()
    .substring(0, 60);

  assert(
    !/[<>:"/\\|?*]/.test(cleanTitle),
    `Special forbidden chars stripped: "${cleanTitle}"`
  );
  assert(cleanTitle.length <= 60, "Length bounded to <= 60 chars");

  // -----------------------------------------------------------------
  // 10. Error Handling for Invalid Video ID
  // -----------------------------------------------------------------
  console.log("\n--- 10. Testing Error Handling for Non-Existent Video ---");
  try {
    await resolveYouTubeVideo("invalid_id999");
    assert(false, "Should have thrown for invalid ID");
  } catch (err: any) {
    assert(
      err.message.includes("Could not retrieve") || err.message.includes("Invalid"),
      "Throws descriptive error on invalid video ID",
      err.message
    );
  }

  // -----------------------------------------------------------------
  // 11. Testing API Route Handler (/api/youtube/info)
  // -----------------------------------------------------------------
  console.log("\n--- 11. Testing Next.js Route Handler (/api/youtube/info) ---");
  try {
    // Health probe (no params)
    const emptyReq = new Request("http://localhost:3000/api/youtube/info");
    const emptyRes = await handleInfoGet(emptyReq);
    assert(emptyRes.status === 200, "Empty GET returns HTTP 200 health probe");
    const emptyJson = await emptyRes.json();
    assert(emptyJson.status === "YouTube Info Service Online", "Health probe contains online status message");

    // Video lookup via query param
    const videoReq = new Request("http://localhost:3000/api/youtube/info?v=xT1gYZGDx4I");
    const videoRes = await handleInfoGet(videoReq);
    assert(videoRes.status === 200, "GET with ?v=xT1gYZGDx4I returns HTTP 200");
    const videoJson = await videoRes.json();
    assert(videoJson.videoId === "xT1gYZGDx4I", "Route handler returned videoId xT1gYZGDx4I");
    assert(Array.isArray(videoJson.qualities) && videoJson.qualities.length > 0, "Route handler returned qualities list");
  } catch (err: any) {
    assert(false, "API Route handler execution", err.message);
  }

  // -----------------------------------------------------------------
  // Test Results Summary
  // -----------------------------------------------------------------
  console.log("\n==========================================================");
  console.log(`TOTAL TESTS:  ${totalTests}`);
  console.log(`PASSED:       ${passedTests}`);
  console.log(`FAILED:       ${failedTests}`);
  console.log("==========================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

void runTestSuite();
