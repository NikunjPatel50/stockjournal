import { z } from "zod";
import { callOpenRouterVision } from "@/lib/openrouter-vision";
import { LISTING_MARKET_IDS } from "@/lib/equity-listing-markets";
import type { OptionsTemplateId } from "@/lib/options-trade-meta";
import {
  legsFromTemplate,
  OPTIONS_LOG_TEMPLATES,
  type OptionsLegDraft,
} from "@/lib/options-trade-form";

const templateIds = [
  "long_call",
  "long_put",
  "short_call",
  "short_put",
  "bull_put_spread",
  "bear_call_spread",
  "iron_condor",
] as const;

const parseSchema = z.object({
  templateId: z.enum(templateIds).optional(),
  underlying: z.string().optional(),
  ticker: z.string().optional(),
  underlyingName: z.string().optional(),
  spotPrice: z.number().optional(),
  listingMarket: z.enum(LISTING_MARKET_IDS).optional(),
  status: z.enum(["Active", "Closed"]).optional(),
  contracts: z.number().int().positive().optional(),
  maxRisk: z.number().optional(),
  ivRank: z.number().optional(),
  deltaAtEntry: z.number().optional(),
  entryDate: z.string().optional(),
  exitDate: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  payoff: z
    .object({
      maxProfit: z.number().optional(),
      maxProfitPct: z.number().optional(),
      maxProfitUnlimited: z.boolean().optional(),
      maxLoss: z.number().optional(),
      maxLossPct: z.number().optional(),
      maxLossUnlimited: z.boolean().optional(),
      breakevens: z.array(z.number()).optional(),
      breakevenPct: z.number().optional(),
      riskReward: z.number().optional(),
      pop: z.number().optional(),
      fundsNeeded: z.number().optional(),
      marginNeeded: z.number().optional(),
    })
    .partial()
    .optional(),
  legs: z
    .array(
      z.object({
        side: z.enum(["Long", "Short"]),
        optionType: z.enum(["Call", "Put"]),
        strike: z.number().optional(),
        expiry: z.string().optional(),
        entryPremium: z.number().optional(),
        exitPremium: z.number().optional(),
      })
    )
    .optional(),
});

export type ParsedOptionsScreenshot = z.infer<typeof parseSchema>;

const SYSTEM_PROMPT = `You extract options trade details from broker screenshots, chain tables, or order confirmations.
Return ONLY valid JSON (no markdown fences) matching this shape:
{
  "templateId": "long_call"|"long_put"|"short_call"|"short_put"|"bull_put_spread"|"bear_call_spread"|"iron_condor",
  "underlying": "REQUIRED when visible — NSE/BSE/US trading symbol only (e.g. RELIANCE, TCS, NIFTY, AAPL) without .NS/.BO suffix",
  "ticker": "same as underlying if the screenshot labels it ticker/symbol",
  "underlyingName": "company or index name as shown (e.g. Apple Inc, Reliance Industries) when symbol is unclear",
  "spotPrice": current underlying/spot/LTP price shown (number) or omit,
  "listingMarket": one of ${LISTING_MARKET_IDS.join("|")},
  "status": "Active"|"Closed",
  "contracts": number of spreads/contracts,
  "maxRisk": number or omit,
  "ivRank": 0-100 or omit,
  "deltaAtEntry": number or omit,
  "entryDate": "YYYY-MM-DDTHH:mm" or omit,
  "exitDate": "YYYY-MM-DDTHH:mm" or omit if open,
  "notes": brief thesis if visible,
  "tags": string array or [],
  "payoff": {
    "maxProfit": total max profit in currency (positive number) or omit,
    "maxProfitPct": percent shown next to max profit (e.g. 4.6) or omit,
    "maxProfitUnlimited": true if shown as Unlimited,
    "maxLoss": total max loss in currency as a POSITIVE number or omit,
    "maxLossPct": percent shown next to max loss as a POSITIVE number (e.g. 32) or omit,
    "maxLossUnlimited": true if shown as Unlimited,
    "breakevens": [breakeven price(s)],
    "breakevenPct": percent distance shown next to breakeven (signed, e.g. -0.8) or omit,
    "riskReward": reward-to-risk number shown as Risk/Reward (e.g. 7) or omit,
    "pop": probability of profit percent 0-100 or omit,
    "fundsNeeded": number or omit,
    "marginNeeded": number or omit
  },
  "legs": [
    {
      "side": "Long"|"Short",
      "optionType": "Call"|"Put",
      "strike": number,
      "expiry": "YYYY-MM-DD",
      "entryPremium": per-share premium at open,
      "exitPremium": per-share premium at close if closed else omit or 0
    }
  ]
}
Infer templateId from leg structure. Use INR/NSE context when you see NSE, ₹, or Indian symbols.
Always set underlying (or ticker + underlyingName) from the screenshot header, chain title, or option contract root symbol.
If the screenshot shows a strategy summary (Max Profit, Max Loss, Breakeven, POP, Risk/Reward, Funds Needed, Margin Needed), fill "payoff". Strip commas and currency symbols from numbers.
If uncertain, still return best-effort values; use empty legs array only if nothing is readable.`;

const EXCHANGE_SUFFIX = /\.(NS|BO|NSE|BSE)$/i;

export function stripListingSuffix(symbol: string): string {
  return symbol.trim().replace(EXCHANGE_SUFFIX, "").trim();
}

export function underlyingSearchTextFromParsed(
  parsed: ParsedOptionsScreenshot
): string | undefined {
  const symbol = parsed.underlying?.trim() || parsed.ticker?.trim();
  if (symbol) return stripListingSuffix(symbol);
  const name = parsed.underlyingName?.trim();
  if (name) return name;
  return undefined;
}

export type ScreenshotFillCompletenessOptions = {
  /** Underlying symbol was verified or committed in the ticker field. */
  underlyingVerified?: boolean;
};

function completenessSlot(ok: boolean): { filled: number; total: number } {
  return { filled: ok ? 1 : 0, total: 1 };
}

/** Share of screenshot-relevant form fields present in parsed data (0–100). */
export function screenshotFillCompleteness(
  parsed: ParsedOptionsScreenshot,
  options: ScreenshotFillCompletenessOptions = {}
): number {
  const { underlyingVerified = false } = options;
  let filled = 0;
  let total = 0;

  function add(ok: boolean) {
    const slot = completenessSlot(ok);
    filled += slot.filled;
    total += slot.total;
  }

  /** Only score optional journal fields when the model returned them. */
  function addIfPresent(value: unknown, ok: boolean) {
    if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) {
      return;
    }
    add(ok);
  }

  const hasUnderlyingText = Boolean(underlyingSearchTextFromParsed(parsed));
  add(underlyingVerified || hasUnderlyingText);
  add(Boolean(parsed.listingMarket));
  add(Boolean(parsed.status));
  add(Boolean(parsed.templateId) || (parsed.legs?.length ?? 0) > 0);
  add(
    (parsed.contracts != null && parsed.contracts > 0) ||
      (parsed.legs?.length ?? 0) > 0
  );
  add(Boolean(parsed.entryDate?.trim()));

  if (parsed.status === "Closed") {
    add(Boolean(parsed.exitDate?.trim()));
  }

  addIfPresent(parsed.maxRisk, parsed.maxRisk != null && parsed.maxRisk > 0);
  addIfPresent(parsed.ivRank, parsed.ivRank != null);
  addIfPresent(parsed.deltaAtEntry, parsed.deltaAtEntry != null);
  addIfPresent(parsed.tags, (parsed.tags?.length ?? 0) > 0);
  addIfPresent(parsed.notes, Boolean(parsed.notes?.trim()));
  for (const value of Object.values(parsed.payoff ?? {})) {
    if (value === false) continue;
    addIfPresent(value, true);
  }

  const legs = parsed.legs ?? [];
  if (legs.length === 0) {
    add(false);
    add(false);
    add(false);
  } else {
    for (const leg of legs) {
      add(leg.strike != null && leg.strike > 0);
      add(Boolean(leg.expiry?.trim()));
      add(leg.entryPremium != null && leg.entryPremium > 0);
      if (parsed.status === "Closed") {
        add(leg.exitPremium != null && leg.exitPremium > 0);
      }
    }
  }

  if (total === 0) return 0;
  return Math.min(100, Math.round((filled / total) * 100));
}

export function screenshotFillProgressLabel(
  percent: number,
  phase: "analyzing" | "applying" | "done" = "done"
): string {
  if (phase === "analyzing") return "Analyzing screenshot…";
  if (phase === "applying") return "Applying details from screenshot…";
  if (percent >= 100) return "Auto-fill complete — review before saving";
  if (percent >= 70) return "Filled from screenshot — review any gaps";
  if (percent > 0) return "Partial fill — add missing fields manually";
  return "Analyzing screenshot…";
}

function coalesceParsedFields(
  raw: z.infer<typeof parseSchema>
): ParsedOptionsScreenshot {
  const underlyingRaw =
    raw.underlying?.trim() || raw.ticker?.trim() || undefined;
  return {
    ...raw,
    underlying: underlyingRaw
      ? stripListingSuffix(underlyingRaw).toUpperCase()
      : undefined,
  };
}

function todayIsoDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** An entry date with a guessed year lands years back; use the latest past year. */
function rollEntryForward(
  parsed: ParsedOptionsScreenshot,
  today: string
): ParsedOptionsScreenshot {
  const raw = parsed.entryDate?.trim();
  const iso = raw?.slice(0, 10);
  if (!raw || !iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return parsed;
  const date = new Date(`${iso}T00:00:00Z`);
  const limit = new Date(`${today}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return parsed;
  for (let i = 0; i < 8; i++) {
    const next = new Date(date);
    next.setUTCFullYear(next.getUTCFullYear() + 1);
    if (next > limit) break;
    date.setUTCFullYear(date.getUTCFullYear() + 1);
  }
  return { ...parsed, entryDate: `${date.toISOString().slice(0, 10)}${raw.slice(10)}` };
}

/**
 * Broker screens print expiries as "27th Oct" with no year, so the model
 * guesses one. A leg cannot expire before the position opened.
 */
function rollExpiriesForward(
  parsed: ParsedOptionsScreenshot,
  today: string
): ParsedOptionsScreenshot {
  if (!parsed.legs?.length) return parsed;
  const entry = parsed.entryDate?.slice(0, 10);
  const reference = entry && /^\d{4}-\d{2}-\d{2}$/.test(entry) ? entry : today;
  const floor = new Date(`${reference}T00:00:00Z`);
  floor.setUTCDate(floor.getUTCDate() - 7);

  return {
    ...parsed,
    legs: parsed.legs.map((leg) => {
      const iso = leg.expiry?.slice(0, 10);
      if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return leg;
      const date = new Date(`${iso}T00:00:00Z`);
      if (Number.isNaN(date.getTime())) return leg;
      while (date < floor) {
        date.setUTCFullYear(date.getUTCFullYear() + 1);
      }
      return { ...leg, expiry: date.toISOString().slice(0, 10) };
    }),
  };
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence?.[1]?.trim() ?? trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("Could not parse AI response as JSON");
  }
  return JSON.parse(body.slice(start, end + 1));
}

export function normalizeTemplateId(
  raw: OptionsTemplateId | undefined,
  legCount: number
): OptionsTemplateId {
  if (raw && templateIds.includes(raw)) return raw;
  if (legCount >= 4) return "iron_condor";
  if (legCount === 2) return "bull_put_spread";
  if (legCount === 1) return "long_call";
  return "bull_put_spread";
}

export async function parseOptionsScreenshot(
  imageDataUrl: string
): Promise<ParsedOptionsScreenshot> {
  if (!imageDataUrl.startsWith("data:image/")) {
    throw new Error("Invalid image data");
  }

  const today = todayIsoDate();
  const rawText = await callOpenRouterVision([
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `Today is ${today}. If an expiry or date omits the year, use the nearest one on or after today. Extract the options position from this screenshot and return JSON only.`,
        },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ],
    },
  ]);

  const json = extractJsonObject(rawText);
  return rollExpiriesForward(
    rollEntryForward(coalesceParsedFields(parseSchema.parse(json)), today),
    today
  );
}

export function mergeParsedLegs(
  templateId: OptionsTemplateId,
  parsedLegs: ParsedOptionsScreenshot["legs"],
  contracts: number
): OptionsLegDraft[] {
  const base = legsFromTemplate(templateId, contracts);
  if (!parsedLegs?.length) return base;

  return base.map((leg, index) => {
    const src = parsedLegs[index] ?? parsedLegs[parsedLegs.length - 1];
    if (!src) return leg;
    return {
      ...leg,
      side: src.side ?? leg.side,
      optionType: src.optionType ?? leg.optionType,
      strike: src.strike ?? leg.strike,
      expiry: src.expiry?.slice(0, 10) ?? leg.expiry,
      entryPremium: src.entryPremium ?? leg.entryPremium,
      exitPremium: src.exitPremium ?? leg.exitPremium,
      quantity: contracts,
    };
  });
}

export function templateLabelForId(id: OptionsTemplateId) {
  return OPTIONS_LOG_TEMPLATES.find((t) => t.id === id)?.strategyName ?? id;
}
