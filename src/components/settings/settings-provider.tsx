"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

function SettingsEffects({
  settings,
  hydrated,
}: {
  settings: AppSettings;
  hydrated: boolean;
}) {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!hydrated) return;
    // Keep next-themes as the only owner of the `dark` class to avoid flash/flicker.
    if (theme !== settings.display.theme) {
      setTheme(settings.display.theme);
    }
  }, [settings.display.theme, hydrated, setTheme, theme]);

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
    setSettings(loaded);
    applyDisplaySettings(loaded.display);
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
