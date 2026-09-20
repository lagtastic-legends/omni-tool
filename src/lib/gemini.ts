import { Capacitor } from "@capacitor/core";

export type MessageRole = "user" | "model";

export interface ChatMessage {
  id?: string;
  role: MessageRole;
  content: string;
  timestamp?: number;
}

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    // Native Capacitor mobile shell needs absolute URL to remote API
    if (Capacitor.isNativePlatform()) {
      return process.env.NEXT_PUBLIC_API_URL || "https://omni-tool-two.vercel.app";
    }
    // Standard web browser: relative URL works across localhost, staging, and custom domains
    return "";
  }
  return process.env.NEXT_PUBLIC_API_URL || "https://omni-tool-two.vercel.app";
}

export const generateAiResponse = async (messages: ChatMessage[]) => {
  try {
    const contents = messages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/ai/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contents }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process that.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return `Connection failed: ${error?.message || "Unknown error occurred"}`;
  }
};

export const streamAiResponse = async function* (messages: ChatMessage[], signal?: AbortSignal) {
  try {
    const contents = messages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/ai/?stream=true`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contents }),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (signal?.aborted) break;
        const trimmed = line.trim();
        if (trimmed === "") continue;
        if (trimmed.startsWith("data: ")) {
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;
          
          try {
            const parsed = JSON.parse(data);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              yield text;
            }
          } catch {
            // ignore JSON parse errors from partial chunks
          }
        }
      }
    }
  } catch (error: any) {
    if (signal?.aborted || error?.name === "AbortError") {
      return;
    }
    console.error("Gemini API Error:", error);
    yield `\n\n[Connection failed: ${error?.message || "Unknown error"}]`;
  }
};
