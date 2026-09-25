import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Content-Type, Authorization, Accept",
  "Access-Control-Expose-Headers": "Content-Range, Content-Length, Content-Type, Accept-Ranges",
};

export const dynamic = "force-static";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url");

    if (!targetUrl) {
      return NextResponse.json(
        { status: "YouTube Stream Proxy Online" },
        { status: 200, headers: corsHeaders }
      );
    }

    // SSRF Security Protection: Ensure URL belongs to Google Video / YouTube CDN
    try {
      const parsed = new URL(targetUrl);
      const isAllowedHost =
        parsed.hostname.endsWith(".googlevideo.com") ||
        parsed.hostname.endsWith(".youtube.com") ||
        parsed.hostname === "googlevideo.com" ||
        parsed.hostname === "youtube.com";

      if (!isAllowedHost) {
        return NextResponse.json(
          { error: "Forbidden: URL host is not an authorized video stream CDN" },
          { status: 403, headers: corsHeaders }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid stream URL" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Forward range header if present for parallel chunk streaming
    const rangeHeader = req.headers.get("range");
    const fetchHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      Accept: "*/*",
      "Accept-Encoding": "identity",
    };

    if (rangeHeader) {
      fetchHeaders["Range"] = rangeHeader;
    }

    const upstreamRes = await fetch(targetUrl, {
      headers: fetchHeaders,
    });

    const responseHeaders = new Headers(corsHeaders);

    const headersToForward = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "cache-control",
      "etag",
    ];

    for (const h of headersToForward) {
      const v = upstreamRes.headers.get(h);
      if (v) responseHeaders.set(h, v);
    }

    // Ensure accept-ranges is always exposed
    if (!responseHeaders.has("accept-ranges")) {
      responseHeaders.set("accept-ranges", "bytes");
    }

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error("YouTube Stream Proxy error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to stream video chunk." },
      { status: 502, headers: corsHeaders }
    );
  }
}
