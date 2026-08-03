import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { tradePulseConfig } from "@/lib/trade-pulse/config";

const FETCH_TIMEOUT_MS = 30_000;

type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

function requireOpenRouterApiKey(): string {
  const apiKey = tradePulseConfig.readOpenRouterApiKey();
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured (or set OPENAI_API_KEY to a valid sk-or-… OpenRouter key)"
    );
  }
  return apiKey;
}

export async function callOpenRouterChat(
  messages: OpenRouterMessage[],
  options: { model?: string; temperature?: number } = {}
): Promise<string> {
  const apiKey = requireOpenRouterApiKey();
  const model = options.model ?? tradePulseConfig.openRouterModel;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://swingtradinglog.com";

  const res = await fetchWithTimeout(
    `${tradePulseConfig.openRouterBaseUrl}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": appUrl,
        "X-Title": "SwingTradingLog Trade Pulse",
      },
      body: JSON.stringify({
        model,
        temperature: options.temperature ?? 0.3,
        messages,
      }),
    },
    FETCH_TIMEOUT_MS
  );

  const payload = (await res.json()) as OpenRouterResponse;
  if (!res.ok) {
    throw new Error(payload.error?.message ?? `OpenRouter request failed (${res.status})`);
  }

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenRouter returned an empty response");
  }

  return content;
}
