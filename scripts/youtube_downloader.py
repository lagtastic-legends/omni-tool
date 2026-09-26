#!/usr/bin/env python3
"""
ZenoDeck YouTube 4K 60FPS Downloader & Metadata Engine
Powered by yt-dlp. Supports resolutions up to 4K (2160p60), 2K (1440p60), 1080p60,
and high-bitrate studio audio (320kbps MP3, 256kbps AAC, FLAC/WAV).
"""

import sys
import json
import argparse
import os
import re

def format_duration(seconds):
    if not seconds or seconds < 0:
        return "0:00"
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"

def extract_video_id(url_or_id):
    if not url_or_id:
        return None
    url_or_id = url_or_id.strip()
    match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11})(?:\?|&|:|$)", url_or_id)
    if match:
        return match.group(1)
    if re.match(r"^[0-9A-Za-z_-]{11}$", url_or_id):
        return url_or_id
    return None

def get_video_info(url):
    try:
        import yt_dlp
    except ImportError:
        return {
            "error": "yt-dlp is not installed. Run: pip install -r requirements.txt"
        }

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            meta = ydl.extract_info(url, download=False)
            if not meta:
                return {"error": "Failed to extract metadata"}

            formats = meta.get("formats", [])
            qualities = []
            seen_badges = set()

            # Process Video Formats (look for 4K 60, 4K, 2K, 1080p60, 1080p, 720p)
            for f in formats:
                vcodec = f.get("vcodec", "none")
                if vcodec == "none":
                    continue
                height = f.get("height") or 0
                fps = f.get("fps") or 30
                filesize = f.get("filesize") or f.get("filesize_approx") or 0

                badge = None
                label = ""
                is_4k = False
                is_60 = fps >= 50

                if height >= 2160:
                    badge = "4K 60FPS" if is_60 else "4K"
                    label = f"Ultra HD 4K ({height}p{fps if is_60 else ''})"
                    is_4k = True
                elif height >= 1440:
                    badge = "2K 60FPS" if is_60 else "2K"
                    label = f"Quad HD 2K ({height}p{fps if is_60 else ''})"
                elif height >= 1080:
                    badge = "1080P 60" if is_60 else "1080P"
                    label = f"Full HD ({height}p{fps if is_60 else ''})"
                elif height >= 720:
                    badge = "720P"
                    label = f"High Definition ({height}p)"
                elif height >= 480 and "SD" not in seen_badges:
                    badge = "SD"
                    label = "Standard Definition (480p)"

                if badge and badge not in seen_badges:
                    seen_badges.add(badge)
                    qualities.append({
                        "itag": f.get("format_id", 0),
                        "label": label,
                        "resolutionLabel": f"{height}p",
                        "fps": int(fps),
                        "badge": badge,
                        "is4K": is_4k,
                        "is60fps": is_60,
                        "isAudioOnly": False,
                        "container": f.get("ext", "mp4"),
                        "approxSizeBytes": filesize,
                        "videoUrl": f.get("url"),
                    })

            # Process Audio Formats
            audio_tiers = [
                ("audio-320", "Studio Master (320 kbps MP3)", "320 KBPS", 320, "mp3"),
                ("audio-256", "High Fidelity (256 kbps AAC)", "256 KBPS", 256, "m4a"),
                ("audio-192", "High Quality (192 kbps MP3)", "192 KBPS", 192, "mp3"),
                ("audio-128", "Standard Audio (128 kbps)", "128 KBPS", 128, "mp3"),
                ("audio-m4a", "Native YouTube Audio (M4A)", "NATIVE AAC", 160, "m4a"),
                ("audio-wav", "Lossless Studio Audio (WAV PCM)", "WAV PCM", 1411, "wav"),
            ]

            # Find best audio source URL
            best_audio = None
            best_abr = 0
            for f in formats:
                if f.get("vcodec") == "none" and (f.get("acodec") != "none"):
                    abr = f.get("abr") or 0
                    if abr > best_abr:
                        best_abr = abr
                        best_audio = f

            audio_url = best_audio.get("url") if best_audio else None
            duration = meta.get("duration", 0)

            for key, label, badge, bitrate, ext in audio_tiers:
                approx_bytes = int((bitrate * 1000 / 8) * duration) if duration else 0
                qualities.append({
                    "itag": key,
                    "label": label,
                    "resolutionLabel": f"{bitrate} kbps",
                    "fps": 0,
                    "badge": badge,
                    "is4K": False,
                    "is60fps": False,
                    "isAudioOnly": True,
                    "audioBitrate": bitrate,
                    "container": ext,
                    "approxSizeBytes": approx_bytes,
                    "audioUrl": audio_url,
                })

            return {
                "videoId": meta.get("id"),
                "title": meta.get("title", ""),
                "author": meta.get("uploader", ""),
                "channelId": meta.get("channel_id", ""),
                "durationSeconds": duration,
                "durationFormatted": format_duration(duration),
                "thumbnailUrl": meta.get("thumbnail", f"https://i.ytimg.com/vi/{meta.get('id')}/maxresdefault.jpg"),
                "viewCount": str(meta.get("view_count", "")),
                "qualities": qualities,
            }
    except Exception as e:
        return {"error": str(e)}

def download_video(url, quality="best", output_dir="."):
    try:
        import yt_dlp
    except ImportError:
        print(json.dumps({"error": "yt-dlp is not installed. Run: pip install yt-dlp"}))
        return 1

    format_selector = "bestvideo+bestaudio/best"
    if quality in ["4k", "2160p"]:
        format_selector = "bestvideo[height<=2160]+bestaudio/best[height<=2160]"
    elif quality in ["2k", "1440p"]:
        format_selector = "bestvideo[height<=1440]+bestaudio/best[height<=1440]"
    elif quality in ["1080p", "1080p60"]:
        format_selector = "bestvideo[height<=1080]+bestaudio/best[height<=1080]"
    elif quality == "720p":
        format_selector = "bestvideo[height<=720]+bestaudio/best[height<=720]"
    elif quality.startswith("audio"):
        format_selector = "bestaudio/best"

    outtmpl = os.path.join(output_dir, "%(title)s.%(ext)s")

    ydl_opts = {
        'format': format_selector,
        'outtmpl': outtmpl,
        'merge_output_format': 'mp4' if not quality.startswith("audio") else None,
        'quiet': False,
        'no_warnings': False,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        return 0
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        return 1

def main():
    parser = argparse.ArgumentParser(description="ZenoDeck YouTube 4K Downloader Engine")
    parser.add_argument("url", help="YouTube video URL or Video ID")
    parser.add_argument("--info-json", action="store_true", help="Output video details and stream qualities in JSON")
    parser.add_argument("--download", action="store_true", help="Download the video directly")
    parser.add_argument("--quality", default="best", help="Target quality (4k, 2k, 1080p, 720p, audio)")
    parser.add_argument("--output-dir", default=".", help="Directory to save downloads")

    args = parser.parse_args()
    vid = extract_video_id(args.url)
    target_url = f"https://www.youtube.com/watch?v={vid}" if vid else args.url

    if args.info_json:
        data = get_video_info(target_url)
        print(json.dumps(data, indent=2))
        return 0 if "error" not in data else 1

    if args.download:
        return download_video(target_url, quality=args.quality, output_dir=args.output_dir)

    # Default action: print info
    data = get_video_info(target_url)
    print(json.dumps(data, indent=2))
    return 0

if __name__ == "__main__":
    sys.exit(main() or 0)
