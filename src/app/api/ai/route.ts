import { NextResponse } from "next/server";

const SYSTEM_INSTRUCTION = `You are Omni, the dedicated AI assistant for the OmniTool app. Your SOLE purpose is to help users navigate and understand OmniTool's features: video transcoding, audio conversion, screen recording, QR generation, PDF tools, and image manipulation.

CRITICAL RULE: DO NOT write code, solve programming problems, or help build projects. DO NOT perform general knowledge tasks unrelated to OmniTool. If a user asks for code, programming help, or anything outside the scope of OmniTool's features, you MUST reject the request by replying EXACTLY with this error message:

'this question you are asking is not for me'

Keep your valid answers concise and friendly, matching a Dark Sci-Fi aesthetic.`;

export async function POST(req: Request) {
  try {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Internal Server Error: API key missing" },
        { status: 500, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { searchParams } = new URL(req.url);
    const isStream = searchParams.get("stream") === "true";

    const endpoint = isStream 
      ? "streamGenerateContent?alt=sse" 
      : "generateContent";

    // Primary: Gemini 3.8 Flash. Fallback: Gemini 3.6 Flash if Google API sheds 503 load
    const candidateModels = ["gemini-3.8-flash", "gemini-3.8-flash", "gemini-3.6-flash"];
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

      // Set low thinking level on Gemini 3.8 to minimize compute spikes that trigger 503s
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
        // Transient 503 (High demand) or 429 (Rate limit): wait briefly and retry
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

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
