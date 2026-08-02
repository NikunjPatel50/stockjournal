import {
  GUEST_SETTINGS_STORAGE_KEY,
  LEGACY_SETTINGS_STORAGE_KEY,
  settingsStorageKey,
} from "@/lib/user-storage";

export type ThemeMode = "dark" | "light" | "system";
export type ColorSemantics = "classic" | "colorblind";
export type TableDensity = "compact" | "normal" | "comfortable";
export type LandingPage =
  | "/dashboard"
  | "/journal"
  | "/goals"
  | "/settings";
export type CurrencyCode = "USD" | "EUR" | "GBP" | "INR" | "CAD";

/** Primary display currency for the product (Indian market). */
export const DEFAULT_CURRENCY: CurrencyCode = "INR";

export interface CustomTag {
  id: string;
  label: string;
  color: string;
}

export interface AppSettings {
  profile: {
    fullName: string;
    handle: string;
    initials: string;
    currency: CurrencyCode;
    startingBalance: number;
  };
  risk: {
    defaultCommission: number;
    commissionMode: "per_trade" | "per_contract";
    maxRiskMode: "percent" | "fixed";
    maxRiskValue: number;
    defaultRiskReward: string;
    dailyMaxDrawdown: number;
    dailyMaxDrawdownMode: "percent" | "fixed";
    maxConsecutiveLosses: number;
  };
  customization: {
    strategies: string[];
    tags: CustomTag[];
  };
  display: {
    theme: ThemeMode;
    colorSemantics: ColorSemantics;
    density: TableDensity;
    landingPage: LandingPage;
    /** Allow generating public share links for closed trades (default on for growth). */
    allowTradeSharing: boolean;
  };
}

export const CURRENCY_OPTIONS: {
  code: CurrencyCode;
  label: string;
  symbol: string;
}[] = [
  { code: "USD", label: "USD $", symbol: "$" },
  { code: "EUR", label: "EUR €", symbol: "€" },
  { code: "GBP", label: "GBP £", symbol: "£" },
  { code: "INR", label: "INR ₹", symbol: "₹" },
  { code: "CAD", label: "CAD $", symbol: "C$" },
];

export const TAG_COLORS = [
  "#10b981",
  "#f43f5e",
  "#f59e0b",
  "#6366f1",
  "#06b6d4",
  "#a855f7",
  "#84cc16",
  "#64748b",
];

/** @deprecated Use per-user keys via user-storage.ts */
export const SETTINGS_STORAGE_KEY = "tradetracker_settings_v1";
/** @deprecated Use per-user keys via user-storage.ts */
export const TRADES_BACKUP_KEY = "tradelog_trades";

/** Old app default — migrated to 0 so equity is not inflated until the user sets a baseline. */
export const LEGACY_DEFAULT_STARTING_BALANCE = 100_000;

export const defaultSettings: AppSettings = {
  profile: {
    fullName: "",
    handle: "",
    initials: "—",
    currency: DEFAULT_CURRENCY,
    startingBalance: 0,
  },
  risk: {
    defaultCommission: 0,
    commissionMode: "per_trade",
    maxRiskMode: "percent",
    maxRiskValue: 1,
    defaultRiskReward: "1:2",
    dailyMaxDrawdown: 3,
    dailyMaxDrawdownMode: "percent",
    maxConsecutiveLosses: 3,
  },
  customization: {
    strategies: [],
    tags: [],
  },
  display: {
    theme: "dark",
    colorSemantics: "classic",
    density: "normal",
    landingPage: "/dashboard",
    allowTradeSharing: true,
  },
};

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function currencySymbol(code: CurrencyCode): string {
  return CURRENCY_OPTIONS.find((c) => c.code === code)?.symbol ?? "₹";
}

function normalizeLandingPage(value: unknown): LandingPage {
  if (value === "/journal" || value === "/goals" || value === "/settings") {
    return value;
  }
  return "/dashboard";
}

function mergeSettings(parsed: Partial<AppSettings>): AppSettings {
  const merged: AppSettings = {
    profile: {
      ...defaultSettings.profile,
      ...parsed.profile,
      currency: DEFAULT_CURRENCY,
    },
    risk: { ...defaultSettings.risk, ...parsed.risk },
    customization: {
      strategies:
        parsed.customization?.strategies ??
        defaultSettings.customization.strategies,
      tags: parsed.customization?.tags ?? defaultSettings.customization.tags,
    },
    display: {
      ...defaultSettings.display,
      ...parsed.display,
      landingPage: normalizeLandingPage(parsed.display?.landingPage),
      allowTradeSharing:
        parsed.display?.allowTradeSharing ??
        defaultSettings.display.allowTradeSharing,
    },
  };

  if (merged.profile.startingBalance === LEGACY_DEFAULT_STARTING_BALANCE) {
    merged.profile.startingBalance = 0;
  }

  return merged;
}

export function loadSettings(userId?: string | null): AppSettings {
  if (typeof window === "undefined") return defaultSettings;

  const storageKey = userId
    ? settingsStorageKey(userId)
    : GUEST_SETTINGS_STORAGE_KEY;

  try {
    let raw = localStorage.getItem(storageKey);

    if (userId && !raw) {
      const legacy = localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY);
      if (legacy) {
        raw = legacy;
        localStorage.setItem(storageKey, legacy);
        localStorage.removeItem(LEGACY_SETTINGS_STORAGE_KEY);
      }
    }

    if (!raw) return { ...defaultSettings };
    return mergeSettings(JSON.parse(raw) as Partial<AppSettings>);
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings: AppSettings, userId?: string | null) {
  if (typeof window === "undefined") return;

  const storageKey = userId
    ? settingsStorageKey(userId)
    : GUEST_SETTINGS_STORAGE_KEY;

  localStorage.setItem(storageKey, JSON.stringify(settings));
  window.dispatchEvent(new Event("tradetracker-settings-updated"));
}

/** Apply non-theme display prefs. Theme class is owned by `next-themes`. */
export function applyDisplaySettings(display: AppSettings["display"]) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.colorSemantics = display.colorSemantics;
  root.dataset.density = display.density;
}
