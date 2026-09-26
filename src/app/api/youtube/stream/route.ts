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

    // Build candidate fallback URLs if the URL contains alternative mn hosts
    const candidateUrls: string[] = [targetUrl];
    try {
      const parsedUrl = new URL(targetUrl);
      const mnParam = parsedUrl.searchParams.get("mn");
      if (mnParam) {
        const nodes = mnParam.split(",").map((s) => s.trim()).filter(Boolean);
        if (nodes.length > 1) {
          const primaryNode = nodes[0];
          for (let i = 1; i < nodes.length; i++) {
            const altNode = nodes[i];
            if (parsedUrl.host.includes(primaryNode)) {
              const altUrl = new URL(targetUrl);
              altUrl.host = parsedUrl.host.replace(primaryNode, altNode);
              candidateUrls.push(altUrl.toString());
            }
          }
        }
      }
    } catch {}

    let upstreamRes: Response | null = null;
    let lastError: Error | null = null;

    for (const urlToTry of candidateUrls) {
      try {
        const res = await fetch(urlToTry, {
          headers: fetchHeaders,
          redirect: "follow",
          signal: AbortSignal.timeout(8000),
        });

        if (res.ok || res.status === 206 || res.status === 304) {
          upstreamRes = res;
          break;
        } else if (res.status >= 500) {
          lastError = new Error(`CDN returned status ${res.status}`);
          continue;
        } else {
          upstreamRes = res;
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!upstreamRes) {
      throw lastError || new Error("Failed to stream from any available CDN node");
    }

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
