/**
 * ZenoDeck — YouTube Playlist & Batch Extraction Engine
 * ======================================================
 *
 * Extracts and parses YouTube playlists with video lists, durations,
 * authors, and thumbnails.
 *
 * Supports both on-device mobile direct queries (InnerTube browse endpoint)
 * and server-side fallback.
 */

import { universalFetch, getYouTubeApiUrl, formatDuration } from "./innertube";

export interface YouTubePlaylistItem {
  videoId: string;
  title: string;
  author: string;
  durationSeconds: number;
  durationFormatted: string;
  thumbnailUrl: string;
  index: number;
}

export interface YouTubePlaylistInfo {
  playlistId: string;
  title: string;
  author: string;
  videoCount: number;
  thumbnailUrl: string;
  items: YouTubePlaylistItem[];
}

/**
 * Extracts a playlist ID from various YouTube URL formats or returns raw ID
 */
export function extractPlaylistId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // Match list= parameter
  const match = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }

  // Raw playlist ID pattern (e.g. PL..., RD..., UU..., FL..., OLAK5uy_...)
  if (/^(?:PL|UU|FL|RD|OLAK5uy_)[a-zA-Z0-9_-]{10,}$/i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Parses playlist items from InnerTube browse response
 */
function parseInnerTubePlaylistResponse(data: any, playlistId: string): YouTubePlaylistInfo | null {
  if (!data) return null;

  let title = "YouTube Playlist";
  let author = "YouTube Channel";
  let thumbnailUrl = "";
  const items: YouTubePlaylistItem[] = [];

  // Metadata extraction
  const metadata = data.metadata?.playlistMetadataRenderer;
  if (metadata) {
    if (metadata.title) title = metadata.title;
  }

  const header =
    data.header?.playlistHeaderRenderer ||
    data.header?.pageHeaderRenderer?.content?.pageHeaderViewModel;
  if (header) {
    if (header.title?.simpleText) title = header.title.simpleText;
    if (header.ownerText?.runs?.[0]?.text) author = header.ownerText.runs[0].text;
    const thumbs = header.playlistHeaderBanner?.thumbnails || header.banner?.thumbnails;
    if (Array.isArray(thumbs) && thumbs.length > 0) {
      thumbnailUrl = thumbs[thumbs.length - 1].url || "";
    }
  }

  // Traverse tabs -> sectionList -> itemSection -> playlistVideoList
  const tabs =
    data.contents?.twoColumnBrowseResultsRenderer?.tabs ||
    data.contents?.singleColumnBrowseResultsRenderer?.tabs ||
    [];

  for (const tab of tabs) {
    const sectionList = tab.tabRenderer?.content?.sectionListRenderer?.contents || [];
    for (const section of sectionList) {
      const itemSectionContents = section.itemSectionRenderer?.contents || [];
      for (const itemSection of itemSectionContents) {
        const videoList = itemSection.playlistVideoListRenderer?.contents || [];
        for (const vItem of videoList) {
          const v = vItem.playlistVideoRenderer;
          if (!v || !v.videoId) continue;

          const vTitle =
            v.title?.runs?.[0]?.text ||
            v.title?.simpleText ||
            "Untitled Video";
          const vAuthor =
            v.shortBylineText?.runs?.[0]?.text ||
            author ||
            "YouTube Creator";

          let durSec = 0;
          if (v.lengthSeconds) {
            durSec = parseInt(v.lengthSeconds, 10) || 0;
          }

          let formattedDur = v.lengthText?.simpleText || "";
          if (!formattedDur && durSec > 0) {
            formattedDur = formatDuration(durSec);
          }

          let thumb = "";
          if (Array.isArray(v.thumbnail?.thumbnails) && v.thumbnail.thumbnails.length > 0) {
            thumb = v.thumbnail.thumbnails[v.thumbnail.thumbnails.length - 1].url || "";
          }

          items.push({
            videoId: v.videoId,
            title: vTitle,
            author: vAuthor,
            durationSeconds: durSec,
            durationFormatted: formattedDur || "0:00",
            thumbnailUrl: thumb,
            index: items.length + 1,
          });
        }
      }
    }
  }

  if (items.length === 0) return null;

  if (!thumbnailUrl && items[0]?.thumbnailUrl) {
    thumbnailUrl = items[0].thumbnailUrl;
  }

  return {
    playlistId,
    title,
    author,
    videoCount: items.length,
    thumbnailUrl,
    items,
  };
}

/**
 * Resolves a full YouTube playlist with videos list
 */
export async function resolveYouTubePlaylist(
  playlistUrlOrId: string,
  clientIp?: string
): Promise<YouTubePlaylistInfo> {
  const playlistId = extractPlaylistId(playlistUrlOrId);
  if (!playlistId) {
    throw new Error("Invalid playlist URL or Playlist ID.");
  }

  // 1. Direct InnerTube browse query
  try {
    const browseId = playlistId.startsWith("VL") ? playlistId : `VL${playlistId}`;
    const payload = {
      context: {
        client: {
          clientName: "WEB",
          clientVersion: "2.20240101.00.00",
          hl: "en",
          gl: "US",
        },
      },
      browseId,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    };
    if (clientIp) headers["X-Forwarded-For"] = clientIp;

    const res = await universalFetch("https://www.youtube.com/youtubei/v1/browse?prettyPrint=false", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      const parsed = parseInnerTubePlaylistResponse(data, playlistId);
      if (parsed && parsed.items.length > 0) {
        return parsed;
      }
    }
  } catch (directErr) {
    console.warn("Direct InnerTube playlist browse error:", directErr);
  }

  // 2. Server API Fallback (/api/youtube/playlist)
  try {
    const apiUrl = getYouTubeApiUrl(`/api/youtube/playlist?list=${encodeURIComponent(playlistId)}`);
    const res = await universalFetch(apiUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        return data as YouTubePlaylistInfo;
      }
    }
  } catch (apiErr) {
    console.warn("Playlist API fallback error:", apiErr);
  }

  throw new Error(
    "Could not resolve playlist videos. Please ensure the playlist is public or unlisted."
  );
}
