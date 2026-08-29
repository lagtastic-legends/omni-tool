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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:${endpoint}&key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: body.contents,
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }]
          }
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json(
        { error: `Google API Error: ${errorData}` },
        { status: response.status, headers: corsHeaders }
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
