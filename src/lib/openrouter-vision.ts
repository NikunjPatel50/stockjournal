import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { tradePulseConfig } from "@/lib/trade-pulse/config";

const FETCH_TIMEOUT_MS = 25_000;
const DEFAULT_VISION_MODEL = "google/gemini-2.5-flash";

type VisionContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type VisionMessage = {
  role: "system" | "user" | "assistant";
  content: string | VisionContentPart[];
};

type OpenRouterResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

export async function callOpenRouterVision(
  messages: VisionMessage[],
  options: { model?: string; temperature?: number } = {}
): Promise<string> {
  const apiKey = tradePulseConfig.readOpenRouterApiKey();
  if (!apiKey) {
    throw new Error(
      "Screenshot fill is not configured on this server (missing OPENROUTER_API_KEY)."
    );
  }

  const model =
    options.model ??
    process.env.OPTIONS_PARSE_OPENROUTER_MODEL?.trim() ??
    DEFAULT_VISION_MODEL;
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
        "X-Title": "SwingTradingLog Options Parse",
      },
      body: JSON.stringify({
        model,
        temperature: options.temperature ?? 0,
        max_tokens: 900,
        reasoning: { enabled: false },
        response_format: { type: "json_object" },
        provider: { sort: "latency" },
        messages,
      }),
    },
    FETCH_TIMEOUT_MS
  );

  const payload = (await res.json()) as OpenRouterResponse;
  if (!res.ok) {
    throw new Error(
      payload.error?.message ?? `Vision request failed (${res.status})`
    );
  }

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Vision model returned an empty response");
  }
  return content;
}
