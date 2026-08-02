"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTheme } from "next-themes";
import {
  applyDisplaySettings,
  defaultSettings,
  loadSettings,
  saveSettings,
  type AppSettings,
  type ThemeMode,
} from "@/lib/settings";
import { getActiveStorageUserId } from "@/lib/user-storage";

interface SettingsContextValue {
  settings: AppSettings;
  hydrated: boolean;
  updateSettings: (updater: (prev: AppSettings) => AppSettings) => void;
  replaceSettings: (next: AppSettings) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const THEME_STORAGE_KEY = "swingtradinglog-theme";

function readStoredThemePreference(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === "light" || parsed === "dark" || parsed === "system") {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function SettingsEffects({
  settings,
  hydrated,
}: {
  settings: AppSettings;
  hydrated: boolean;
}) {
  const { setTheme } = useTheme();
  const appliedSettingsTheme = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (appliedSettingsTheme.current === settings.display.theme) return;
    appliedSettingsTheme.current = settings.display.theme;
    setTheme(settings.display.theme);
  }, [settings.display.theme, hydrated, setTheme]);

  useEffect(() => {
    if (!hydrated) return;
    applyDisplaySettings(settings.display);
    saveSettings(settings, getActiveStorageUserId());
  }, [settings, hydrated]);

  return null;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const userId = getActiveStorageUserId();
    const loaded = loadSettings(userId);
    const storedTheme = readStoredThemePreference();
    const merged: AppSettings = storedTheme
      ? {
          ...loaded,
          display: { ...loaded.display, theme: storedTheme },
        }
      : loaded;
    setSettings(merged);
    applyDisplaySettings(merged.display);
    setHydrated(true);
  }, []);

  const updateSettings = useCallback(
    (updater: (prev: AppSettings) => AppSettings) => {
      setSettings((prev) => updater(prev));
    },
    []
  );

  const replaceSettings = useCallback((next: AppSettings) => {
    setSettings(next);
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  const value = useMemo(
    () => ({
      settings,
      hydrated,
      updateSettings,
      replaceSettings,
      resetSettings,
    }),
    [settings, hydrated, updateSettings, replaceSettings, resetSettings]
  );

  return (
    <SettingsContext.Provider value={value}>
      <SettingsEffects settings={settings} hydrated={hydrated} />
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return ctx;
}
