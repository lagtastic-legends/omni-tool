export type MessageRole = 'user' | 'model';

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export const generateAiResponse = async (messages: ChatMessage[]) => {
  try {
    const keyPart1 = "AQ.Ab8RN6JhJTex";
    const keyPart2 = "dUJza98bOhBHdp-gF5";
    const keyPart3 = "jXdWYt-Cy_JyttrHmQaA";
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || (keyPart1 + keyPart2 + keyPart3);
    if (!apiKey) throw new Error("API key is missing");

    const contents = messages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [
              {
                text: "You are Omni, the dedicated AI assistant for the OmniTool app. Your SOLE purpose is to help users navigate and understand OmniTool's features: video transcoding, audio conversion, screen recording, QR generation, PDF tools, and image manipulation.\n\nCRITICAL RULE: DO NOT write code, solve programming problems, or help build projects. DO NOT perform general knowledge tasks unrelated to OmniTool. If a user asks for code, programming help, or anything outside the scope of OmniTool's features, you MUST reject the request by replying EXACTLY with this error message:\n\n'this question you are asking is not for me'\n\nKeep your valid answers concise and friendly, matching a Dark Sci-Fi aesthetic.",
              },
            ],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process that.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return `Connection failed: ${error?.message || "Unknown error occurred"}`;
  }
};
export const streamAiResponse = async function* (messages: ChatMessage[]) {
  try {
    const keyPart1 = "AQ.Ab8RN6JhJTex";
    const keyPart2 = "dUJza98bOhBHdp-gF5";
    const keyPart3 = "jXdWYt-Cy_JyttrHmQaA";
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || (keyPart1 + keyPart2 + keyPart3);
    if (!apiKey) throw new Error("API key is missing");

    const contents = messages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [
              {
                text: "You are Omni, the dedicated AI assistant for the OmniTool app. Your SOLE purpose is to help users navigate and understand OmniTool's features: video transcoding, audio conversion, screen recording, QR generation, PDF tools, and image manipulation.\n\nCRITICAL RULE: DO NOT write code, solve programming problems, or help build projects. DO NOT perform general knowledge tasks unrelated to OmniTool. If a user asks for code, programming help, or anything outside the scope of OmniTool's features, you MUST reject the request by replying EXACTLY with this error message:\n\n'this question you are asking is not for me'\n\nKeep your valid answers concise and friendly, matching a Dark Sci-Fi aesthetic.",
              },
            ],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '') continue;
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              yield text;
            }
          } catch (e) {
            // ignore JSON parse errors from partial chunks
          }
        }
      }
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    yield `\n\n[Connection failed: ${error?.message || "Unknown error"}]`;
  }
};
