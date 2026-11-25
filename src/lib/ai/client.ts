export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function aiConfigured() {
  const key = process.env.AI_GATEWAY_KEY?.trim();
  const baseUrl = process.env.AI_GATEWAY_BASE_URL?.trim();
  const model = process.env.AI_GATEWAY_MODEL?.trim();
  return Boolean(key && baseUrl && model);
}

export function aiConfig() {
  const key = process.env.AI_GATEWAY_KEY?.trim() || "";
  const baseUrl = (process.env.AI_GATEWAY_BASE_URL?.trim() || "").replace(
    /\/$/,
    "",
  );
  const model = process.env.AI_GATEWAY_MODEL?.trim() || "";
  return { key, baseUrl, model };
}

/**
 * OpenAI-compatible chat/completions.
 * Provider URL, model, and key come only from env — swap any compatible endpoint later.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  opts?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const { key, baseUrl, model } = aiConfig();
  if (!key || !baseUrl || !model) {
    throw new Error(
      "AI is not configured. Set AI_GATEWAY_KEY, AI_GATEWAY_BASE_URL, and AI_GATEWAY_MODEL.",
    );
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts?.temperature ?? 0.4,
      max_tokens: opts?.maxTokens ?? 700,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI gateway ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("AI gateway returned empty content");
  return content;
}
