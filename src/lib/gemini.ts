export type MessageRole = 'user' | 'model';

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export const generateAiResponse = async (messages: ChatMessage[]) => {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
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
                text: "You are Omni, a helpful, brilliant AI assistant built directly into the OmniTool app. OmniTool is a powerful media suite that offers video transcoding, audio conversion, screen recording, QR generation, PDF tools, image manipulation, and more. Keep your answers concise, friendly, and helpful. You prefer a Dark Sci-Fi aesthetic.",
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
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
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
                text: "You are Omni, a helpful, brilliant AI assistant built directly into the OmniTool app. OmniTool is a powerful media suite that offers video transcoding, audio conversion, screen recording, QR generation, PDF tools, image manipulation, and more. Keep your answers concise, friendly, and helpful. You prefer a Dark Sci-Fi aesthetic.",
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

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
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
