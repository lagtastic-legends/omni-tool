import { NextResponse } from "next/server";
import { resolveYouTubeVideo, extractYouTubeId } from "@/lib/youtube/innertube";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const dynamic = "force-static";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const urlOrId = searchParams.get("url") || searchParams.get("v") || searchParams.get("videoId");

    if (!urlOrId) {
      return NextResponse.json({ status: "YouTube Info Service Online" }, { headers: corsHeaders });
    }

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      undefined;

    const info = await resolveYouTubeVideo(urlOrId, clientIp);
    return NextResponse.json(info, { headers: corsHeaders });
  } catch (error: any) {
    console.error("YouTube Info API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to resolve YouTube video streams." },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const urlOrId = body.url || body.videoId || body.v;

    if (!urlOrId) {
      return NextResponse.json(
        { error: "Missing required body field 'url' or 'videoId'" },
        { status: 400, headers: corsHeaders }
      );
    }

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      undefined;

    const info = await resolveYouTubeVideo(urlOrId, clientIp);
    return NextResponse.json(info, { headers: corsHeaders });
  } catch (error: any) {
    console.error("YouTube Info API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to resolve YouTube video streams." },
      { status: 500, headers: corsHeaders }
    );
  }
}
