export type MessageRole = "user" | "model";

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export const generateAiResponse = async (messages: ChatMessage[]) => {
  try {
    const contents = messages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    // For Capacitor, this must be changed to the absolute URL of the hosted backend (e.g. https://your-domain.com/api/ai)
    const response = await fetch("https://omni-tool-3m7ppzpwi-lagtastic-legends.vercel.app/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contents }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
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
    const contents = messages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    // For Capacitor, this must be changed to the absolute URL of the hosted backend (e.g. https://your-domain.com/api/ai?stream=true)
    const response = await fetch("https://omni-tool-3m7ppzpwi-lagtastic-legends.vercel.app/api/ai?stream=true", {
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

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
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
