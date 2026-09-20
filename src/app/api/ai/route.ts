import { NextResponse } from "next/server";

const SYSTEM_INSTRUCTION = `You are Omni, the dedicated AI assistant for the OmniTool app. Your SOLE purpose is to help users navigate and understand OmniTool's features: video transcoding, audio conversion, screen recording, QR generation, PDF tools, and image manipulation.

CRITICAL RULE: DO NOT write code, solve programming problems, or help build projects. DO NOT perform general knowledge tasks unrelated to OmniTool. If a user asks for code, programming help, or anything outside the scope of OmniTool's features, you MUST reject the request by replying EXACTLY with this error message:

'this question you are asking is not for me'

Keep your valid answers concise and friendly, matching a Dark Sci-Fi aesthetic.`;

// In-memory sliding window rate limiter (20 requests/minute per client IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 25;

  // Cleanup expired entries periodically
  if (rateLimitMap.size > 1000) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (val.resetAt < now) rateLimitMap.delete(key);
    }
  }

  const record = rateLimitMap.get(ip);
  if (!record || record.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count += 1;
  return true;
}

export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin") || "*";
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Client IP detection (X-Forwarded-For or CF-Connecting-IP)
    const clientIp =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment before sending more requests." },
        { status: 429, headers: corsHeaders }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Internal Server Error: AI Service Key Unconfigured" },
        { status: 500, headers: corsHeaders }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!body || !Array.isArray(body.contents) || body.contents.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid 'contents' in request body" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (body.contents.length > 50) {
      return NextResponse.json(
        { error: "Conversation history exceeds maximum permitted length (50 turns)" },
        { status: 400, headers: corsHeaders }
      );
    }

    const { searchParams } = new URL(req.url);
    const isStream = searchParams.get("stream") === "true";

    const endpoint = isStream 
      ? "streamGenerateContent?alt=sse" 
      : "generateContent";

    // Primary: Gemini 3.8 Flash. Fallback: Gemini 3.6 Flash if primary sheds load
    const candidateModels = ["gemini-3.8-flash", "gemini-3.6-flash"];
    let response: Response | null = null;
    let lastErrorData = "";

    for (let i = 0; i < candidateModels.length; i++) {
      const model = candidateModels[i];
      const payload: Record<string, unknown> = {
        contents: body.contents,
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }],
        },
      };

      if (model.startsWith("gemini-3.8")) {
        payload.generationConfig = {
          thinkingConfig: {
            thinkingLevel: "low",
          },
        };
      }

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}&key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        if (res.ok) {
          response = res;
          break;
        }

        lastErrorData = await res.text();
        if (res.status === 503 || res.status === 429) {
          if (i < candidateModels.length - 1) {
            await new Promise((r) => setTimeout(r, 400));
            continue;
          }
        } else {
          response = res;
          break;
        }
      } catch (err: unknown) {
        lastErrorData = err instanceof Error ? err.message : String(err);
      }
    }

    if (!response || !response.ok) {
      return NextResponse.json(
        { error: `Google API Error: ${lastErrorData || "Service temporarily unavailable"}` },
        { status: response?.status || 503, headers: corsHeaders }
      );
    }

    if (isStream && response.body) {
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    const data = await response.json();
    return NextResponse.json(data, { headers: corsHeaders });

  } catch (error: any) {
    console.error("AI API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin") || "*";
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
