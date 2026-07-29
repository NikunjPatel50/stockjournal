/** Per-user localStorage keys so new accounts never inherit another user's data. */

let activeStorageUserId: string | null = null;

export function setActiveStorageUserId(userId: string | null) {
  activeStorageUserId = userId;
}

export function getActiveStorageUserId(): string | null {
  return activeStorageUserId;
}

export function tradesStorageKey(userId: string) {
  return `swingtradinglog_trades_v1_${userId}`;
}

export function settingsStorageKey(userId: string) {
  return `swingtradinglog_settings_v1_${userId}`;
}

/** Pre–per-user trade backup (migrated once for the signing-in user). */
export const LEGACY_TRADES_BACKUP_KEY = "tradelog_trades";

export const LEGACY_SETTINGS_STORAGE_KEY = "tradetracker_settings_v1";

export const GUEST_SETTINGS_STORAGE_KEY = "tradetracker_settings_guest_v1";
