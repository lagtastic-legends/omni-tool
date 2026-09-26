/**
 * ZenoDeck — YouTube InnerTube Metadata & Stream Resolver
 *
 * Lightweight, zero-dependency extractor querying YouTube's official
 * InnerTube player endpoints (ANDROID_VR / TVHTML5 profiles).
 * Resolves full adaptive stream manifests including 4K 60fps (2160p60)
 * with direct unthrottled streaming URLs.
 */

export interface YouTubeFormatMeta {
  itag: number;
  url: string;
  mimeType: string;
  container: "mp4" | "webm" | "m4a";
  codec: string;
  bitrate: number;
  averageBitrate?: number;
  contentLength?: number;
  qualityLabel?: string;
  width?: number;
  height?: number;
  fps?: number;
  audioQuality?: string;
  audioSampleRate?: string;
  approxDurationMs?: number;
}

export interface YouTubeQualityOption {
  id: string; // e.g. "2160p60", "1080p60", "audio-320", "audio-256", "audio-192", "audio-128", "audio-m4a", "audio-wav"
  label: string;
  resolutionLabel: string;
  fps: number;
  badge:
    | "4K 60FPS"
    | "4K"
    | "2K 60FPS"
    | "2K"
    | "1080P 60"
    | "1080P"
    | "720P"
    | "SD"
    | "320 KBPS"
    | "256 KBPS"
    | "192 KBPS"
    | "128 KBPS"
    | "NATIVE AAC"
    | "WAV PCM"
    | "AUDIO"
    | string;
  is4K: boolean;
  is60fps: boolean;
  isAudioOnly: boolean;
  audioBitrate?: number; // in kbps (e.g. 320, 256, 192, 128)
  container: "mp4" | "webm" | "mp3" | "m4a" | "wav";
  approxSizeBytes: number;
  videoFormat?: YouTubeFormatMeta;
  audioFormat?: YouTubeFormatMeta;
}

export interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  author: string;
  channelId?: string;
  durationSeconds: number;
  durationFormatted: string;
  thumbnailUrl: string;
  viewCount?: string;
  qualities: YouTubeQualityOption[];
}

/**
 * Robust YouTube video ID parser supporting watch URLs, short URLs,
 * shorts, embeds, and raw 11-char video IDs.
 */
export function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // If already an 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle standard YouTube URLs
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Format duration in seconds to "MM:SS" or "HH:MM:SS"
 */
export function formatDuration(sec: number): string {
  if (isNaN(sec) || sec < 0) return "00:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Format bytes to readable size string (MB / GB)
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "Unknown size";
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Helper to get the absolute or relative YouTube API endpoint.
 * In web dev/production, relative /api/youtube/... is used.
 * In Capacitor Android APK, falls back to the production API origin.
 */
export function getYouTubeApiUrl(path: string): string {
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (origin && !origin.includes("capacitor") && !origin.startsWith("file:")) {
      // In dev (port 3000) or public web domain, use origin directly
      if (window.location.port === "3000" || (!origin.includes("localhost") && !origin.includes("127.0.0.1"))) {
        return `${origin}${path}`;
      }
    }
  }
  const fallback = process.env.NEXT_PUBLIC_APP_URL || "https://omni-tool-two.vercel.app";
  return `${fallback.replace(/\/$/, "")}${path}`;
}

const IOS_CLIENT_VERSION = "20.10.4";
const IOS_USER_AGENT = `com.google.ios.youtube/${IOS_CLIENT_VERSION} (iPhone16,2; U; CPU iOS 18_1 like Mac OS X; en_US)`;

const INNERTUBE_CLIENTS = [
  {
    name: "IOS_PRIMARY",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": IOS_USER_AGENT,
      "X-YouTube-Client-Name": "5",
      "X-YouTube-Client-Version": IOS_CLIENT_VERSION,
    },
    context: {
      client: {
        clientName: "IOS",
        clientVersion: IOS_CLIENT_VERSION,
        deviceModel: "iPhone16,2",
        hl: "en",
        gl: "US",
      },
    },
  },
  {
    name: "IOS_SECONDARY",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": `com.google.ios.youtube/20.15.2 (iPhone16,2; U; CPU iOS 18_1 like Mac OS X; en_US)`,
      "X-YouTube-Client-Name": "5",
      "X-YouTube-Client-Version": "20.15.2",
    },
    context: {
      client: {
        clientName: "IOS",
        clientVersion: "20.15.2",
        deviceModel: "iPhone16,2",
        hl: "en",
        gl: "US",
      },
    },
  },
  {
    name: "ANDROID_TESTSUITE",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    context: {
      client: {
        clientName: "ANDROID_TESTSUITE",
        clientVersion: "1.9",
        hl: "en",
        gl: "US",
      },
    },
  },
];

/**
 * Resolves video details and extracts complete 4K 60fps streaming manifest
 */
export async function resolveYouTubeVideo(videoIdOrUrl: string): Promise<YouTubeVideoInfo> {
  const videoId = extractYouTubeId(videoIdOrUrl);
  if (!videoId) {
    throw new Error("Invalid YouTube URL or Video ID. Please check the link and try again.");
  }

  let lastError: Error | null = null;
  let playerResponse: any = null;

  for (const clientConfig of INNERTUBE_CLIENTS) {
    try {
      const res = await fetch("https://www.youtube.com/youtubei/v1/player", {
        method: "POST",
        headers: clientConfig.headers,
        body: JSON.stringify({
          videoId,
          context: clientConfig.context,
          playbackContext: {
            contentPlaybackContext: {
              html5Preference: "HTML5_PREF_WANTS",
              signatureTimestamp: 20000,
            },
          },
        }),
      });

      if (!res.ok) continue;

      const data = await res.json();
      const status = data.playabilityStatus?.status;

      if (status === "OK" && (data.streamingData?.formats || data.streamingData?.adaptiveFormats)) {
        playerResponse = data;
        break;
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  if (!playerResponse) {
    throw new Error(
      lastError?.message ||
        "Could not retrieve video streaming data. The video may be private, age-restricted, or region-locked."
    );
  }

  const details = playerResponse.videoDetails || {};
  const title = details.title || "YouTube Video";
  const author = details.author || details.channelTitle || "Unknown Artist";
  const durationSeconds = Number(details.lengthSeconds) || 0;
  const durationFormatted = formatDuration(durationSeconds);
  const viewCount = Number(details.viewCount || 0).toLocaleString();

  // Pick highest quality thumbnail
  const thumbs = details.thumbnail?.thumbnails || [];
  const thumbnailUrl =
    thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  const rawAdaptive: any[] = playerResponse.streamingData?.adaptiveFormats || [];
  const rawCombined: any[] = playerResponse.streamingData?.formats || [];

  // Parse all formats
  const parsedFormats: YouTubeFormatMeta[] = [];

  for (const f of [...rawCombined, ...rawAdaptive]) {
    if (!f.url) continue;

    const mime = f.mimeType || "";
    const container = mime.includes("video/mp4")
      ? "mp4"
      : mime.includes("audio/mp4")
      ? "m4a"
      : "webm";
    const codecMatch = mime.match(/codecs="([^"]+)"/);
    const codec = codecMatch ? codecMatch[1] : "";

    const contentLength = f.contentLength ? Number(f.contentLength) : undefined;
    const bitrate = Number(f.bitrate) || 0;

    parsedFormats.push({
      itag: f.itag,
      url: f.url,
      mimeType: mime,
      container,
      codec,
      bitrate,
      averageBitrate: f.averageBitrate ? Number(f.averageBitrate) : undefined,
      contentLength:
        contentLength ||
        (durationSeconds && bitrate ? Math.round((bitrate * durationSeconds) / 8) : undefined),
      qualityLabel: f.qualityLabel,
      width: f.width,
      height: f.height,
      fps: f.fps || 30,
      audioQuality: f.audioQuality,
      audioSampleRate: f.audioSampleRate,
      approxDurationMs: f.approxDurationMs ? Number(f.approxDurationMs) : undefined,
    });
  }

  // Find best available audio format (prioritize high-bitrate Opus or AAC)
  const audioFormats = parsedFormats
    .filter((f) => f.mimeType.startsWith("audio/"))
    .sort((a, b) => b.bitrate - a.bitrate);

  const bestAudio = audioFormats[0];

  // Group and sort video formats
  const videoFormats = parsedFormats.filter((f) => f.mimeType.startsWith("video/"));

  // Build targeted quality tiers
  const qualities: YouTubeQualityOption[] = [];

  // Helper to find best format matching resolution and fps criteria
  const findFormat = (minHeight: number, maxHeight: number, prefer60 = false) => {
    const candidates = videoFormats.filter((f) => {
      const h = f.height || (f.qualityLabel ? parseInt(f.qualityLabel) : 0);
      return h >= minHeight && h <= maxHeight;
    });

    if (candidates.length === 0) return null;

    if (prefer60) {
      const fps60 = candidates.filter((f) => (f.fps || 0) >= 50);
      if (fps60.length > 0) {
        return fps60.sort((a, b) => b.bitrate - a.bitrate)[0];
      }
    }

    return candidates.sort((a, b) => b.bitrate - a.bitrate)[0];
  };

  // 1. 4K 60fps / 4K UHD (2160p)
  const fmt4k = findFormat(2000, 2160, true);
  if (fmt4k) {
    const is60 = (fmt4k.fps || 0) >= 50;
    const vSize = fmt4k.contentLength || 0;
    const aSize = bestAudio?.contentLength || 0;
    qualities.push({
      id: is60 ? "2160p60" : "2160p",
      label: is60 ? "4K Ultra HD 60fps" : "4K Ultra HD",
      resolutionLabel: "3840 × 2160 (2160p)",
      fps: fmt4k.fps || 30,
      badge: is60 ? "4K 60FPS" : "4K",
      is4K: true,
      is60fps: is60,
      isAudioOnly: false,
      container: "mp4",
      approxSizeBytes: vSize + aSize,
      videoFormat: fmt4k,
      audioFormat: bestAudio,
    });
  }

  // 2. 2K 60fps / 1440p QHD
  const fmt2k = findFormat(1300, 1440, true);
  if (fmt2k) {
    const is60 = (fmt2k.fps || 0) >= 50;
    const vSize = fmt2k.contentLength || 0;
    const aSize = bestAudio?.contentLength || 0;
    qualities.push({
      id: is60 ? "1440p60" : "1440p",
      label: is60 ? "2K Quad HD 60fps" : "2K Quad HD",
      resolutionLabel: "2560 × 1440 (1440p)",
      fps: fmt2k.fps || 30,
      badge: is60 ? "2K 60FPS" : "2K",
      is4K: false,
      is60fps: is60,
      isAudioOnly: false,
      container: "mp4",
      approxSizeBytes: vSize + aSize,
      videoFormat: fmt2k,
      audioFormat: bestAudio,
    });
  }

  // 3. 1080p 60fps / 1080p FHD
  const fmt1080 = findFormat(950, 1080, true);
  if (fmt1080) {
    const is60 = (fmt1080.fps || 0) >= 50;
    const vSize = fmt1080.contentLength || 0;
    const aSize = bestAudio?.contentLength || 0;
    qualities.push({
      id: is60 ? "1080p60" : "1080p",
      label: is60 ? "Full HD 60fps" : "Full HD 1080p",
      resolutionLabel: "1920 × 1080 (1080p)",
      fps: fmt1080.fps || 30,
      badge: is60 ? "1080P 60" : "1080P",
      is4K: false,
      is60fps: is60,
      isAudioOnly: false,
      container: "mp4",
      approxSizeBytes: vSize + aSize,
      videoFormat: fmt1080,
      audioFormat: bestAudio,
    });
  }

  // 4. 720p HD
  const fmt720 = findFormat(650, 720, true);
  if (fmt720) {
    const vSize = fmt720.contentLength || 0;
    const aSize = bestAudio?.contentLength || 0;
    qualities.push({
      id: "720p",
      label: "High Definition 720p",
      resolutionLabel: "1280 × 720 (720p)",
      fps: fmt720.fps || 30,
      badge: "720P",
      is4K: false,
      is60fps: (fmt720.fps || 0) >= 50,
      isAudioOnly: false,
      container: "mp4",
      approxSizeBytes: vSize + aSize,
      videoFormat: fmt720,
      audioFormat: bestAudio,
    });
  }

  // 5. 480p / 360p Standard Quality
  const fmt480 = findFormat(320, 480);
  if (fmt480) {
    const vSize = fmt480.contentLength || 0;
    const aSize = bestAudio?.contentLength || 0;
    qualities.push({
      id: "480p",
      label: "Standard Definition 480p",
      resolutionLabel: "854 × 480 (480p)",
      fps: fmt480.fps || 30,
      badge: "SD",
      is4K: false,
      is60fps: false,
      isAudioOnly: false,
      container: "mp4",
      approxSizeBytes: vSize + aSize,
      videoFormat: fmt480,
      audioFormat: bestAudio,
    });
  }

  // Fallback: If no standard quality tier matched (e.g. very old 240p/360p video), add highest available video format
  const hasVideoTier = qualities.some((q) => !q.isAudioOnly);
  if (!hasVideoTier && videoFormats.length > 0) {
    const topVideo = [...videoFormats].sort((a, b) => (b.height || 0) - (a.height || 0))[0];
    const h = topVideo.height || (topVideo.qualityLabel ? parseInt(topVideo.qualityLabel) : 360);
    const vSize = topVideo.contentLength || 0;
    const aSize = bestAudio?.contentLength || 0;
    qualities.unshift({
      id: `${h}p`,
      label: `Standard Definition ${h}p`,
      resolutionLabel: `${topVideo.width || 640} × ${h} (${h}p)`,
      fps: topVideo.fps || 30,
      badge: "SD",
      is4K: false,
      is60fps: false,
      isAudioOnly: false,
      container: "mp4",
      approxSizeBytes: vSize + aSize,
      videoFormat: topVideo,
      audioFormat: bestAudio,
    });
  }

  // 6. Direct Audio Extraction Qualities (Multi-tier bitrates & native/lossless formats)
  if (bestAudio) {
    const bestM4a = audioFormats.find((f) => f.container === "m4a") || bestAudio;

    // 6a. 320 kbps Studio Master MP3
    qualities.push({
      id: "audio-320",
      label: "Studio Master (320 kbps MP3)",
      resolutionLabel: "Ultra HQ 320 kbps · 44.1 kHz Stereo",
      fps: 0,
      badge: "320 KBPS",
      is4K: false,
      is60fps: false,
      isAudioOnly: true,
      audioBitrate: 320,
      container: "mp3",
      approxSizeBytes:
        durationSeconds > 0
          ? Math.round((320 * 1000 * durationSeconds) / 8)
          : (bestAudio.contentLength || 0),
      audioFormat: bestAudio,
    });

    // 6b. 256 kbps High Fidelity MP3
    qualities.push({
      id: "audio-256",
      label: "High Fidelity (256 kbps MP3)",
      resolutionLabel: "Pro Audio 256 kbps · 44.1 kHz Stereo",
      fps: 0,
      badge: "256 KBPS",
      is4K: false,
      is60fps: false,
      isAudioOnly: true,
      audioBitrate: 256,
      container: "mp3",
      approxSizeBytes:
        durationSeconds > 0
          ? Math.round((256 * 1000 * durationSeconds) / 8)
          : Math.round((bestAudio.contentLength || 0) * 0.8),
      audioFormat: bestAudio,
    });

    // 6c. 192 kbps Standard HQ MP3
    qualities.push({
      id: "audio-192",
      label: "Standard HQ (192 kbps MP3)",
      resolutionLabel: "Balanced 192 kbps · Great for Music",
      fps: 0,
      badge: "192 KBPS",
      is4K: false,
      is60fps: false,
      isAudioOnly: true,
      audioBitrate: 192,
      container: "mp3",
      approxSizeBytes:
        durationSeconds > 0
          ? Math.round((192 * 1000 * durationSeconds) / 8)
          : Math.round((bestAudio.contentLength || 0) * 0.6),
      audioFormat: bestAudio,
    });

    // 6d. 128 kbps Compact MP3
    qualities.push({
      id: "audio-128",
      label: "Compact Audio (128 kbps MP3)",
      resolutionLabel: "Lightweight · Podcasts & Voice",
      fps: 0,
      badge: "128 KBPS",
      is4K: false,
      is60fps: false,
      isAudioOnly: true,
      audioBitrate: 128,
      container: "mp3",
      approxSizeBytes:
        durationSeconds > 0
          ? Math.round((128 * 1000 * durationSeconds) / 8)
          : Math.round((bestAudio.contentLength || 0) * 0.4),
      audioFormat: bestAudio,
    });

    // 6e. Native AAC / M4A (Original Stream Copy)
    qualities.push({
      id: "audio-m4a",
      label: "Original Stream (M4A / AAC)",
      resolutionLabel: "Direct Native Audio · Zero Quality Loss",
      fps: 0,
      badge: "NATIVE AAC",
      is4K: false,
      is60fps: false,
      isAudioOnly: true,
      container: "m4a",
      approxSizeBytes: bestM4a.contentLength || bestAudio.contentLength || 0,
      audioFormat: bestM4a,
    });

    // 6f. Uncompressed WAV PCM
    qualities.push({
      id: "audio-wav",
      label: "Studio Master PCM (WAV)",
      resolutionLabel: "Uncompressed 16-bit 44.1 kHz WAV",
      fps: 0,
      badge: "WAV PCM",
      is4K: false,
      is60fps: false,
      isAudioOnly: true,
      container: "wav",
      approxSizeBytes:
        durationSeconds > 0
          ? Math.round(44100 * 2 * 2 * durationSeconds)
          : (bestAudio.contentLength ? bestAudio.contentLength * 4 : 0),
      audioFormat: bestAudio,
    });
  }

  return {
    videoId,
    title,
    author,
    channelId: details.channelId,
    durationSeconds,
    durationFormatted,
    thumbnailUrl,
    viewCount,
    qualities,
  };
}
